const { Router } = require("express");
const reportController = require("./reportController");
const { authenticate, authorize } = require("../../middleware/authMiddleware");

const router = Router();
router.use(authenticate);
router.use(authorize("da_monitoring", "admin"));

/**
 * @openapi
 * /api/v1/admin/reports/submission-progress:
 *   get:
 *     tags:
 *       - Reports
 *     summary: Submission collection progress
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Progress report
 */
router.get("/submission-progress", reportController.submissionProgress);

/**
 * @openapi
 * /api/v1/admin/reports/market-coverage:
 *   get:
 *     tags:
 *       - Reports
 *     summary: Market coverage report
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Coverage report
 */
router.get("/market-coverage", reportController.marketCoverage);

/**
 * @openapi
 * /api/v1/admin/reports/price-trend:
 *   get:
 *     tags:
 *       - Reports
 *     summary: Price trend report
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: weeks
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Price trend
 */
router.get("/price-trend", reportController.priceTrend);

module.exports = router;
