const express = require("express");
const { initializeDatabase } = require("./config/database");
const serviceRoutes = require("./routes/serviceRoutes");
require("dotenv").config();
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const pm2 = require("pm2");
const { spawn } = require("child_process");

// Lấy đường dẫn tuyệt đối đến file pm2
const pm2Path = require.resolve("pm2/bin/pm2");

const app = express();
app.use(express.json());
app.use(cors());

// Tạo HTTP server từ Express app
const server = http.createServer(app);

// Tạo Socket.IO server và gắn vào HTTP server
const io = new Server(server, {
  cors: { origin: "*" },
});

// Kết nối đến PM2 khi server khởi động
pm2.connect((err) => {
  if (err) {
    console.error("Error connecting to PM2:", err);
    process.exit(2);
  } else {
    console.log("PM2 connected");
    // Sau khi kết nối PM2, ta launch PM2 logs process để lắng nghe log
    // Sử dụng process.execPath để gọi Node và truyền file pm2Path cùng tham số
    const pm2LogsProcess = spawn(process.execPath, [pm2Path, "logs", "--raw"]);

    // Xử lý dữ liệu stdout của tiến trình pm2 logs
    pm2LogsProcess.stdout.on("data", (data) => {
      const rawData = data.toString();
      console.log("Raw PM2 logs stdout data:", rawData); // Debug: in dữ liệu thô
      const lines = rawData.split("\n");
      lines.forEach((line) => {
        if (line.trim() === "") return;
        // Debug: in ra từng dòng trước khi parse
        console.log("Processing log line:", line);
        // Ví dụ định dạng log: [2025-02-07T10:00:00.000Z] [service_6] Some log content here...
        const regex = /\[.*?\]\s+\[(service_\d+)\]\s+(.*)/;
        const match = regex.exec(line);
        if (match) {
          const processName = match[1]; // Ví dụ: "service_6"
          const logContent = match[2];
          const serviceId = processName.replace("service_", "");
          io.to(`log-${serviceId}`).emit("logUpdate", {
            serviceId,
            log: logContent,
            error: false,
          });
        } else {
          console.warn("Không parse được dòng log:", line);
        }
      });
    });

    // Xử lý dữ liệu stderr của tiến trình pm2 logs
    pm2LogsProcess.stderr.on("data", (data) => {
      const rawData = data.toString();
      console.log("Raw PM2 logs stderr data:", rawData); // Debug: in dữ liệu thô
      const lines = rawData.split("\n");
      lines.forEach((line) => {
        if (line.trim() === "") return;
        const regex = /\[.*?\]\s+\[(service_\d+)\]\s+(.*)/;
        const match = regex.exec(line);
        if (match) {
          const processName = match[1];
          const logContent = match[2];
          const serviceId = processName.replace("service_", "");
          io.to(`log-${serviceId}`).emit("logUpdate", {
            serviceId,
            log: logContent,
            error: true,
          });
        } else {
          console.warn("Không parse được dòng log (stderr):", line);
        }
      });
    });

    pm2LogsProcess.on("error", (err) => {
      console.error("Error in pm2 logs process:", err);
    });

    pm2LogsProcess.on("exit", (code, signal) => {
      console.warn(
        `pm2 logs process exited with code ${code} and signal ${signal}`
      );
    });
  }
});

// Gán instance io vào app.locals để controller sử dụng (nếu cần)
app.locals.io = io;

// Socket.IO: Lắng nghe các sự kiện subscribeLog, unsubscribeLog, subscribePerformance
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("subscribeLog", (serviceId) => {
    socket.join(`log-${serviceId}`);
    console.log(
      `Socket ${socket.id} subscribed to logs for service ${serviceId}`
    );
  });
  socket.on("unsubscribeLog", (serviceId) => {
    socket.leave(`log-${serviceId}`);
    console.log(
      `Socket ${socket.id} unsubscribed from logs for service ${serviceId}`
    );
  });

  socket.on("subscribePerformance", (serviceId) => {
    console.log(
      `Socket ${socket.id} subscribed for performance of service ${serviceId}`
    );
    const intervalId = setInterval(() => {
      const pm2Name = `service_${serviceId}`;
      pm2.describe(pm2Name, (err, processDescription) => {
        if (err) {
          console.error("PM2 describe error:", err);
          socket.emit("performanceUpdate", {
            serviceId,
            performance: null,
            message: "Error retrieving performance",
          });
          return;
        }
        if (!processDescription || processDescription.length === 0) {
          socket.emit("performanceUpdate", {
            serviceId,
            performance: null,
            message: "Process not running",
          });
          return;
        }
        const proc = processDescription[0];
        const pid = proc.pid;
        if (!pid || typeof pid !== "number" || pid === 0) {
          socket.emit("performanceUpdate", {
            serviceId,
            performance: null,
            message: "Process PID not available",
          });
          return;
        }
        require("pidusage")(pid, (err, stats) => {
          if (err) {
            console.error("pidusage error:", err);
            socket.emit("performanceUpdate", {
              serviceId,
              performance: null,
              message: "Error retrieving performance",
            });
            return;
          }
          socket.emit("performanceUpdate", { serviceId, performance: stats });
        });
      });
    }, 3000);

    socket.on("unsubscribePerformance", () => {
      clearInterval(intervalId);
    });
    socket.on("disconnect", () => {
      clearInterval(intervalId);
    });
  });
});

(async () => {
  try {
    const sequelize = await initializeDatabase();
    const createServiceModel = require("./models/Service");
    const Service = createServiceModel(sequelize);
    await sequelize.sync();
    app.locals.Service = Service;
    app.use("/api/service", serviceRoutes);

    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      console.log(`Server đang chạy trên port ${PORT}`);
    });
  } catch (err) {
    console.error("Lỗi khi khởi tạo server:", err);
  }
})();
