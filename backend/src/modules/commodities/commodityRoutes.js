const { Router } = require("express");
const commodityController = require("./commodityController");
const { authenticate, authorize } = require("../../middleware/authMiddleware");

const router = Router();

// Public routes
router.get("/", commodityController.list);
router.get("/prices/latest", commodityController.getLatestPrices);
router.get("/:id/trend", commodityController.getPriceTrend);

module.exports = router;
