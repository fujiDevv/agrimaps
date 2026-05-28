const { Router } = require("express");
const dashboardController = require("./dashboardController");
const { authenticate, authorize } = require("../../middleware/authMiddleware");

const router = Router();
router.get("/", dashboardController.getPublic);
router.get("/admin", authenticate, authorize("da_monitoring", "admin"), dashboardController.getAdmin);

module.exports = router;
