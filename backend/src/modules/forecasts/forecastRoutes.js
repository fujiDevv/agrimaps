const { Router } = require("express");
const forecastController = require("./forecastController");
const { authenticate, authorize } = require("../../middleware/authMiddleware");

const router = Router();

/**
 * @openapi
 * /api/v1/public/forecasts:
 *   get:
 *     tags:
 *       - Forecasts
 *     summary: Latest forecasts for all commodities
 *     parameters:
 *       - in: query
 *         name: horizon
 *         schema:
 *           type: integer
 *         description: Forecast horizon weeks
 *     responses:
 *       200:
 *         description: Forecasts list
 */
router.get("/", forecastController.getAllLatest);

/**
 * @openapi
 * /api/v1/public/forecasts/{commodityId}:
 *   get:
 *     tags:
 *       - Forecasts
 *     summary: Latest forecast for a commodity
 *     parameters:
 *       - in: path
 *         name: commodityId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: horizon
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Forecast details
 */
router.get("/:commodityId", forecastController.getLatest);

/**
 * @openapi
 * /api/v1/admin/forecasts/generate/{commodityId}:
 *   post:
 *     tags:
 *       - Forecasts
 *     summary: Generate forecast
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: commodityId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               horizon:
 *                 type: integer
 *                 example: 4
 *     responses:
 *       200:
 *         description: Forecast generated
 */
router.post("/generate/:commodityId", authenticate, authorize("da_monitoring", "admin"), forecastController.generate);

module.exports = router;
