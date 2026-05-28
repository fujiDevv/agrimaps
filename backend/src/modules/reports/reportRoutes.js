const { Router } = require("express");
const reportController = require("./reportController");
const { authenticate, authorize } = require("../../middleware/authMiddleware");

const router = Router();
router.use(authenticate);
router.use(authorize("da_monitoring", "admin"));

router.get("/submission-progress", reportController.submissionProgress);
router.get("/market-coverage", reportController.marketCoverage);
router.get("/price-trend", reportController.priceTrend);

module.exports = router;
