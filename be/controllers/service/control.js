const { exec } = require("child_process");
const pidusage = require("pidusage");
const pm2 = require("pm2");

/**
 * Các hàm bọc (wrapper) sử dụng Promise cho PM2.
 */

const pm2Describe = (name) => {
  return new Promise((resolve, reject) => {
    pm2.describe(name, (err, desc) => {
      if (err) return reject(err);
      resolve(desc);
    });
  });
};

const pm2Start = (options) => {
  return new Promise((resolve, reject) => {
    pm2.start(options, (err, proc) => {
      if (err) return reject(err);
      resolve(proc);
    });
  });
};

const pm2Stop = (name) => {
  return new Promise((resolve, reject) => {
    pm2.stop(name, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
};

const pm2Restart = (name) => {
  return new Promise((resolve, reject) => {
    pm2.restart(name, (err, proc) => {
      if (err) return reject(err);
      resolve(proc);
    });
  });
};

/**
 * Điều khiển service: start, stop, restart
 * - Dành cho service kiểu "node" và "exe" sử dụng PM2.
 * - Dành cho service kiểu "windows" sử dụng lệnh exec (sc).
 */
exports.controlService = async (Service, req, res) => {
  try {
    const { id, action } = req.params;
    const serviceConfig = await Service.findByPk(id);
    if (!serviceConfig) {
      return res.status(404).json({ error: "Service not found" });
    }

    // Nếu cần gửi log qua Socket.IO (nếu có)
    const io = req.app.locals.io;

    if (serviceConfig.type === "node" || serviceConfig.type === "exe") {
      const pm2Name = `service_${id}`;
      const pm2Options = {
        name: pm2Name,
        script: serviceConfig.path,
        // Với exe, chỉ định interpreter "none"
        ...(serviceConfig.type === "exe" && { interpreter: "none" }),
      };

      if (action === "start") {
        await pm2Start(pm2Options);
        // Lấy lại thông tin tiến trình để xác định PID
        const processDescription = await pm2Describe(pm2Name);
        if (!processDescription || processDescription.length === 0) {
          return res.status(404).json({ error: "Process not found" });
        }
        const pid = processDescription[0].pid;
        console.log(
          `${serviceConfig.type} service ${id} started with pid ${pid}`
        );
        return res.json({
          message: `${serviceConfig.type} service started`,
          pid,
        });
      } else if (action === "stop") {
        await pm2Stop(pm2Name);
        console.log(`${serviceConfig.type} service ${id} stopped`);
        return res.json({
          message: `${serviceConfig.type} service stopped`,
        });
      } else if (action === "restart") {
        await pm2Restart(pm2Name);
        const processDescription = await pm2Describe(pm2Name);
        if (!processDescription || processDescription.length === 0) {
          return res.status(404).json({ error: "Process not found" });
        }
        const pid = processDescription[0].pid;
        console.log(
          `${serviceConfig.type} service ${id} restarted with pid ${pid}`
        );
        return res.json({
          message: `${serviceConfig.type} service restarted`,
          pid,
        });
      } else {
        return res
          .status(400)
          .json({ error: "Action không hợp lệ cho service này" });
      }
    } else if (serviceConfig.type === "windows") {
      let cmd = "";
      switch (action) {
        case "start":
          cmd = `sc start ${serviceConfig.path}`;
          break;
        case "stop":
          cmd = `sc stop ${serviceConfig.path}`;
          break;
        case "restart":
          cmd = `sc stop ${serviceConfig.path} && sc start ${serviceConfig.path}`;
          break;
        default:
          return res
            .status(400)
            .json({ error: "Action không hợp lệ cho Windows service" });
      }
      exec(cmd, (error, stdout, stderr) => {
        if (error) {
          console.error(`Lỗi khi thực hiện lệnh [${cmd}]:`, error);
          return res.status(500).json({ error: error.message });
        }
        return res.json({ stdout, stderr });
      });
    } else {
      return res.status(400).json({ error: "Kiểu service không xác định" });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

/**
 * Lấy thông tin hiệu năng (PID, CPU, Memory, ...)
 * Chỉ hỗ trợ cho service kiểu "node" hoặc "exe" (dùng pidusage)
 */
exports.getPerformanceDetails = async (Service, req, res) => {
  try {
    const { id } = req.params;
    const serviceConfig = await Service.findByPk(id);
    if (!serviceConfig) {
      return res.status(404).json({ error: "Service not found" });
    }
    if (serviceConfig.type === "node" || serviceConfig.type === "exe") {
      const pm2Name = `service_${id}`;
      const processDescription = await pm2Describe(pm2Name);
      if (!processDescription || processDescription.length === 0) {
        return res
          .status(404)
          .json({ error: "Process not running or not found" });
      }
      const proc = processDescription[0];
      const pid = proc.pid;
      if (!pid || typeof pid !== "number" || pid === 0) {
        return res.status(404).json({ error: "Process PID not available" });
      }
      // Sử dụng pidusage để lấy thông số hiệu năng
      pidusage(pid, (err, stats) => {
        if (err) {
          if (err.code === "ENOENT") {
            console.error(`Process with pid ${pid} not found.`);
            return res
              .status(404)
              .json({ error: "Process not found, it may have exited." });
          }
          console.error("Lỗi khi lấy thông tin performance:", err);
          return res.status(500).json({ error: "Không thể lấy performance" });
        }
        return res.json({
          pid,
          status: "Running",
          port: serviceConfig.port || null,
          performance: stats,
        });
      });
    } else {
      return res.status(501).json({
        error:
          "Chưa hỗ trợ lấy thông tin hiệu năng cho kiểu service này (không dùng PM2).",
      });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
