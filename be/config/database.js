// config/database.js
const mysql = require("mysql2/promise");
const { Sequelize } = require("sequelize");
require("dotenv").config(); // Load biến môi trường từ .env

const MYSQL_CONFIG = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
};

const DATABASE_NAME = process.env.DB_NAME;

/**
 * Khởi tạo database: tạo database nếu chưa tồn tại,
 * sau đó khởi tạo đối tượng Sequelize kết nối với database đó.
 */
async function initializeDatabase() {
  // Kết nối tới MySQL server mà không chỉ định database
  const connection = await mysql.createConnection(MYSQL_CONFIG);
  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${DATABASE_NAME}\`;`);
  await connection.end();

  // Tạo Sequelize instance kết nối đến database vừa tạo
  const sequelize = new Sequelize(
    DATABASE_NAME,
    MYSQL_CONFIG.user,
    MYSQL_CONFIG.password,
    {
      host: MYSQL_CONFIG.host,
      dialect: "mysql",
      logging: false,
    }
  );
  return sequelize;
}

module.exports = { initializeDatabase };
