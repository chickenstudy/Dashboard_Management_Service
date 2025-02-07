// controllers/serviceController.js
const { exec, spawn } = require("child_process");
const pidusage = require("pidusage");

/**
 * Biến lưu tiến trình Node service đang chạy.
 * Key: id của service (từ DB)
 * Value: đối tượng child process (spawn)
 */
const nodeProcesses = {};

/* ---------------------------------------------------------------------------
 *                          TẠO MỚI SERVICE
 * ---------------------------------------------------------------------------
 *  - Nếu type = "node":
 *      - Lưu DB, path là file .js
 *  - Nếu type = "windows":
 *      - Nếu autoCreateService = true:
 *          1. sc create <name> binPath= "<path>" start= auto
 *          2. sc start <name>
 *          3. Lưu DB, path = name
 *      - Nếu autoCreateService = false:
 *          - Giả định service đã cài -> chỉ lưu DB
 * ------------------------------------------------------------------------- */
exports.createService = async (Service, req, res) => {
  try {
    const {
      name,
      type,
      path,
      description,
      port,
      autoCreateService, // Cờ để biết có cần tạo service Windows hay không
    } = req.body;

    // ---- Trường hợp Node service ----
    if (type === "node") {
      const newService = await Service.create({
        name,
        type,
        path, // Đường dẫn file .js
        description,
        port,
      });
      return res.status(201).json(newService);
    }

    // ---- Trường hợp Windows service ----
    else if (type === "windows") {
      // ----- autoCreateService = true -> tạo qua sc create -----
      if (autoCreateService) {
        const createCmd = `sc create ${name} binPath= "${path}" start= auto`;
        console.log("[INFO] Creating Windows service:", createCmd);

        exec(createCmd, (createErr, createStdout, createStderr) => {
          if (createErr) {
            console.error("[ERROR] sc create fail:", createErr);
            return res.status(500).json({
              error: `Lỗi tạo Windows service: ${createErr.message}`,
            });
          }
          // Tạo service thành công => start service
          const startCmd = `sc start ${name}`;
          console.log("[INFO] Starting Windows service:", startCmd);

          exec(startCmd, async (startErr, startStdout, startStderr) => {
            if (startErr) {
              console.error("[ERROR] sc start fail:", startErr);
              return res.status(500).json({
                error: `Lỗi start Windows service: ${startErr.message}`,
              });
            }
            // Tạo & start xong => lưu DB
            try {
              // Lưu path = name để sau này sc stop <serviceConfig.path>
              const newServiceData = {
                name,
                type,
                path: name, // path bây giờ chính là tên service
                description,
                port,
              };
              const newService = await Service.create(newServiceData);

              return res.status(201).json({
                message: "Đã auto create và start Windows service thành công",
                service: newService,
              });
            } catch (dbErr) {
              console.error("[ERROR] Lưu DB fail:", dbErr);
              return res.status(500).json({ error: dbErr.message });
            }
          });
        });
      }
      // ----- autoCreateService = false -> đã cài sẵn -----
      else {
        // Khi đó path = tên service cài sẵn, ta chỉ lưu DB
        const newService = await Service.create({
          name,
          type,
          path, // Ở đây path chính là tên service cài sẵn
          description,
          port,
        });
        return res.status(201).json(newService);
      }
    }

    // ---- Kiểu service không xác định ----
    else {
      return res.status(400).json({ error: "Kiểu service không xác định" });
    }
  } catch (err) {
    console.error("[ERROR] createService:", err);
    return res.status(500).json({ error: err.message });
  }
};

/* ---------------------------------------------------------------------------
 *                          LẤY DANH SÁCH SERVICE
 * ------------------------------------------------------------------------- */
exports.getServices = async (Service, req, res) => {
  try {
    const services = await Service.findAll();
    res.json(services);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ---------------------------------------------------------------------------
 *                          CẬP NHẬT SERVICE
 * ------------------------------------------------------------------------- */
exports.updateService = async (Service, req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const [updated] = await Service.update(updateData, { where: { id } });
    if (!updated) return res.status(404).json({ error: "Service not found" });
    const updatedService = await Service.findByPk(id);
    res.json(updatedService);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ---------------------------------------------------------------------------
 *                          XOÁ SERVICE
 * ------------------------------------------------------------------------- */
exports.deleteService = async (Service, req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Service.destroy({ where: { id } });
    if (!deleted) return res.status(404).json({ error: "Service not found" });
    res.json({ message: "Service deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ---------------------------------------------------------------------------
 *                 START / STOP / RESTART SERVICE
 * ---------------------------------------------------------------------------
 *  - Node: spawn/kill tiến trình node
 *  - Windows: sc start/stop <serviceName>
 * ------------------------------------------------------------------------- */
exports.controlService = async (Service, req, res) => {
  try {
    const { id, action } = req.params;
    const serviceConfig = await Service.findByPk(id);
    if (!serviceConfig) {
      return res.status(404).json({ error: "Service not found" });
    }

    // ---- Node service ----
    if (serviceConfig.type === "node") {
      switch (action) {
        case "start": {
          if (nodeProcesses[id]) {
            return res.status(400).json({ error: "Node service đã chạy" });
          }
          const child = spawn("node", [serviceConfig.path]);
          nodeProcesses[id] = child;
          console.log(`Node service ${id} started with pid ${child.pid}`);
          return res.json({ message: "Node service started", pid: child.pid });
        }
        case "stop": {
          if (!nodeProcesses[id]) {
            return res
              .status(400)
              .json({ error: "Node service không đang chạy" });
          }
          nodeProcesses[id].kill();
          delete nodeProcesses[id];
          return res.json({ message: "Node service stopped" });
        }
        case "restart": {
          if (nodeProcesses[id]) {
            nodeProcesses[id].kill();
            delete nodeProcesses[id];
          }
          const newChild = spawn("node", [serviceConfig.path]);
          nodeProcesses[id] = newChild;
          console.log(`Node service ${id} restarted with pid ${newChild.pid}`);
          return res.json({
            message: "Node service restarted",
            pid: newChild.pid,
          });
        }
        default:
          return res
            .status(400)
            .json({ error: "Action không hợp lệ cho Node service" });
      }
    }
    // ---- Windows service ----
    else if (serviceConfig.type === "windows") {
      // Ở đây serviceConfig.path = "Tên service" (sau khi create)
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
    }
    // ---- Không xác định ----
    else {
      return res.status(400).json({ error: "Kiểu service không xác định" });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

/* ---------------------------------------------------------------------------
 *     LẤY THÔNG TIN HIỆU NĂNG (CPU, RAM, ...) - CHỈ CHO NODE SERVICE
 * ------------------------------------------------------------------------- */
exports.getPerformanceDetails = async (Service, req, res) => {
  try {
    const { id } = req.params;
    const serviceConfig = await Service.findByPk(id);
    if (!serviceConfig) {
      return res.status(404).json({ error: "Service not found" });
    }

    if (serviceConfig.type === "node") {
      // Kiểm tra tiến trình đang chạy
      if (!nodeProcesses[id]) {
        return res.status(400).json({ error: "Node service không đang chạy" });
      }
      const pid = nodeProcesses[id].pid;
      pidusage(pid, (err, stats) => {
        if (err) {
          console.error("Lỗi khi lấy thông tin performance:", err);
          if (err.code === "ENOENT") {
            return res.status(404).json({
              error:
                "Không tìm thấy tiến trình. Có thể Node service đã kết thúc.",
            });
          }
          return res
            .status(500)
            .json({ error: "Không thể lấy thông tin performance" });
        }
        // stats: { cpu, memory, ... }
        return res.json({
          pid,
          status: "Running",
          port: serviceConfig.port || null,
          performance: stats,
        });
      });
    } else if (serviceConfig.type === "windows") {
      return res.status(501).json({
        error: "Chưa hỗ trợ lấy thông tin hiệu năng cho Windows service",
      });
    } else {
      return res.status(400).json({ error: "Kiểu service không xác định" });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// Có thể xuất biến nodeProcesses nếu cần dùng ở chỗ khác
exports.nodeProcesses = nodeProcesses;
