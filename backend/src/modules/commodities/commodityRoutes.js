const { Router } = require("express");
const commodityController = require("./commodityController");
const { authenticate, authorize } = require("../../middleware/authMiddleware");

const router = Router();

// Public routes
/**
 * @openapi
 * /api/v1/public/commodities:
 *   get:
 *     tags:
 *       - Commodities
 *     summary: List all commodities
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category (e.g. rice, vegetables)
 *       - in: query
 *         name: forecastableOnly
 *         schema:
 *           type: boolean
 *         description: Filter forecastable commodities
 *     responses:
 *       200:
 *         description: List of commodities
 */
router.get("/", commodityController.list);

/**
 * @openapi
 * /api/v1/public/commodities/prices/latest:
 *   get:
 *     tags:
 *       - Commodities
 *     summary: Latest price per commodity with trend
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Latest prices
 */
router.get("/prices/latest", commodityController.getLatestPrices);

/**
 * @openapi
 * /api/v1/public/commodities/{id}/trend:
 *   get:
 *     tags:
 *       - Commodities
 *     summary: Price trend for a commodity
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: weeks
 *         schema:
 *           type: integer
 *         description: Custom trend period
 *     responses:
 *       200:
 *         description: Trend data
 */
router.get("/:id/trend", commodityController.getPriceTrend);


module.exports = router;
