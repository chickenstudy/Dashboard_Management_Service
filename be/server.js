const express = require("express");
const { initializeDatabase } = require("./config/database");
const serviceRoutes = require("./routes/serviceRoutes");
require("dotenv").config();
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

(async () => {
  try {
    // Khởi tạo database và kết nối Sequelize
    const sequelize = await initializeDatabase();

    // Import và khởi tạo model Service
    const createServiceModel = require("./models/Service");
    const Service = createServiceModel(sequelize);

    // Đồng bộ các model (tạo bảng nếu chưa tồn tại)
    await sequelize.sync();

    // Lưu model Service vào app.locals để các route có thể truy cập
    app.locals.Service = Service;

    // Đăng ký route cho Service
    app.use("/api/service", serviceRoutes);

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`Server đang chạy trên port ${PORT}`);
    });
  } catch (err) {
    console.error("Lỗi khi khởi tạo server:", err);
  }
})(); // Đóng đúng IIFE ở đây
