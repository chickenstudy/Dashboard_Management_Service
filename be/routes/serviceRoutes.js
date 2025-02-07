// routes/serviceRoutes.js
const express = require("express");
const router = express.Router();
const serviceController = require("../controllers/serviceController");

// Middleware kiểm tra sự tồn tại của Service model
router.use((req, res, next) => {
  if (!req.app.locals.Service) {
    return res.status(500).json({ error: "Service model not available" });
  }
  next();
});

// Tạo mới Service
router.post("/", (req, res) => {
  serviceController.createService(req.app.locals.Service, req, res);
});

// Lấy danh sách Service (trả thêm trường "running" nếu service đang hoạt động)
router.get("/", (req, res) => {
  serviceController.getServices(req.app.locals.Service, req, res);
});

// Cập nhật Service
router.put("/:id", (req, res) => {
  serviceController.updateService(req.app.locals.Service, req, res);
});

// Xóa Service
router.delete("/:id", (req, res) => {
  serviceController.deleteService(req.app.locals.Service, req, res);
});

// Điều khiển Service: start, stop, restart
router.post("/:id/:action", (req, res) => {
  serviceController.controlService(req.app.locals.Service, req, res);
});

// Lấy thông tin hiệu năng cho một Service
router.get("/:id/performance", (req, res) => {
  serviceController.getPerformanceDetails(req.app.locals.Service, req, res);
});

module.exports = router;
