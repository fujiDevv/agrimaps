const { Router } = require("express");
const marketController = require("./marketController");

const router = Router();

/**
 * @openapi
 * /api/v1/public/markets:
 *   get:
 *     tags:
 *       - Markets
 *     summary: List all NCR markets
 *     parameters:
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *         description: Filter by city (e.g., Manila)
 *     responses:
 *       200:
 *         description: List of markets
 */
router.get("/", marketController.list);

/**
 * @openapi
 * /api/v1/public/markets/geojson:
 *   get:
 *     tags:
 *       - Markets
 *     summary: GeoJSON for WebGIS rendering
 *     parameters:
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *         description: Filter GeoJSON by city
 *     responses:
 *       200:
 *         description: GeoJSON of markets
 */
router.get("/geojson", marketController.getGeoJSON);


module.exports = router;
