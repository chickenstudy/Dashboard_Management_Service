// models/Service.js
const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  return sequelize.define(
    "Service",
    {
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      // Kiểu service: 'node' hoặc 'windows'
      type: {
        type: DataTypes.ENUM("node", "windows"),
        allowNull: false,
      },
      // Đối với Node: đường dẫn file cần chạy (ví dụ: app.js)
      // Đối với Windows: tên định danh service trên Windows
      path: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      // Thêm trường port (nếu có)
      port: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      timestamps: true,
    }
  );
};
