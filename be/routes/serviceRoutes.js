// routes/serviceRoutes.js
const express = require("express");
const router = express.Router();
const serviceController = require("../controllers/serviceController");

// Tạo mới Service
router.post("/", (req, res) => {
  req.app.locals.Service &&
    serviceController.createService(req.app.locals.Service, req, res);
});

// Lấy danh sách Service
router.get("/", (req, res) => {
  req.app.locals.Service &&
    serviceController.getServices(req.app.locals.Service, req, res);
});

// Cập nhật Service
router.put("/:id", (req, res) => {
  req.app.locals.Service &&
    serviceController.updateService(req.app.locals.Service, req, res);
});

// Xóa Service
router.delete("/:id", (req, res) => {
  req.app.locals.Service &&
    serviceController.deleteService(req.app.locals.Service, req, res);
});

// Điều khiển Service: start, stop, restart
router.post("/:id/:action", (req, res) => {
  req.app.locals.Service &&
    serviceController.controlService(req.app.locals.Service, req, res);
});

// Lấy thông tin hiệu năng cho một Service
router.get("/:id/performance", (req, res) => {
  req.app.locals.Service &&
    serviceController.getPerformanceDetails(req.app.locals.Service, req, res);
});

module.exports = router;
