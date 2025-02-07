// controllers/service/crud.js
const { exec } = require("child_process");

/**
 * TẠO MỚI SERVICE
 * - type "node" hoặc "exe": lưu thông tin và chạy bằng PM2 (sau này sẽ điều khiển qua module control)
 * - type "windows": sử dụng exec với lệnh sc create/ sc start
 */
exports.createService = async (Service, req, res) => {
  try {
    const { name, type, path, description, port, autoCreateService } = req.body;
    if (type === "node" || type === "exe") {
      const newService = await Service.create({
        name,
        type,
        path,
        description,
        port,
      });
      return res.status(201).json(newService);
    } else if (type === "windows") {
      if (autoCreateService) {
        const createCmd = `sc create ${name} binPath= "${path}" start= auto`;
        console.log("[INFO] Creating Windows service:", createCmd);
        exec(createCmd, (createErr) => {
          if (createErr) {
            console.error("[ERROR] sc create fail:", createErr);
            return res
              .status(500)
              .json({ error: `Lỗi tạo Windows service: ${createErr.message}` });
          }
          const startCmd = `sc start ${name}`;
          console.log("[INFO] Starting Windows service:", startCmd);
          exec(startCmd, async (startErr) => {
            if (startErr) {
              console.error("[ERROR] sc start fail:", startErr);
              return res.status(500).json({
                error: `Lỗi start Windows service: ${startErr.message}`,
              });
            }
            try {
              const newServiceData = {
                name,
                type,
                path: name, // Với Windows, path được xem như tên service đã cài
                description,
                port,
              };
              const newService = await Service.create(newServiceData);
              return res.status(201).json({
                message: "Đã auto create & start Windows service thành công",
                service: newService,
              });
            } catch (dbErr) {
              console.error("[ERROR] Lưu DB fail:", dbErr);
              return res.status(500).json({ error: dbErr.message });
            }
          });
        });
      } else {
        const newService = await Service.create({
          name,
          type,
          path,
          description,
          port,
        });
        return res.status(201).json(newService);
      }
    } else {
      return res.status(400).json({ error: "Kiểu service không xác định" });
    }
  } catch (err) {
    console.error("[ERROR] createService:", err);
    return res.status(500).json({ error: err.message });
  }
};

/**
 * LẤY DANH SÁCH SERVICE
 * Thêm trường running cho các service kiểu "node" và "exe" dựa trên trạng thái PM2.
 */
exports.getServices = async (Service, req, res) => {
  try {
    const services = await Service.findAll();

    // Kết nối đến PM2 để kiểm tra trạng thái các service kiểu "node" hoặc "exe"
    await new Promise((resolve, reject) => {
      const pm2 = require("pm2");
      pm2.connect((err) => {
        if (err) return reject(err);
        resolve();
      });
    });

    const pm2 = require("pm2");
    const servicesWithStatus = await Promise.all(
      services.map(async (service) => {
        let running = false;
        if (service.type === "node" || service.type === "exe") {
          const pm2Name = `service_${service.id}`;
          try {
            const processDescription = await new Promise((resolve, reject) => {
              pm2.describe(pm2Name, (err, desc) => {
                if (err) return reject(err);
                resolve(desc);
              });
            });
            if (
              processDescription &&
              processDescription.length > 0 &&
              processDescription[0].pid &&
              typeof processDescription[0].pid === "number" &&
              processDescription[0].pid !== 0
            ) {
              running = true;
            }
          } catch (error) {
            running = false;
          }
        } else if (service.type === "windows") {
          // Ở đây bạn có thể mở rộng kiểm tra trạng thái cho Windows service (ví dụ dùng lệnh sc query)
          running = false;
        }
        return { ...service.toJSON(), running };
      })
    );

    pm2.disconnect();
    res.json(servicesWithStatus);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * CẬP NHẬT SERVICE
 */
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

/**
 * XOÁ SERVICE
 */
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
