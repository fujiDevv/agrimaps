const { Router } = require("express");
const forecastController = require("./forecastController");
const { authenticate, authorize } = require("../../middleware/authMiddleware");

const router = Router();
router.get("/", forecastController.getAllLatest);
router.get("/:commodityId", forecastController.getLatest);
router.post("/generate/:commodityId", authenticate, authorize("da_monitoring", "admin"), forecastController.generate);

module.exports = router;
