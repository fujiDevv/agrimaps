const { Router } = require("express");
const dashboardController = require("./dashboardController");
const { authenticate, authorize } = require("../../middleware/authMiddleware");

const router = Router();

/**
 * @openapi
 * /api/v1/public/dashboard:
 *   get:
 *     tags:
 *       - Dashboard
 *     summary: Public dashboard stats
 *     responses:
 *       200:
 *         description: Dashboard stats
 */
router.get("/", dashboardController.getPublic);

/**
 * @openapi
 * /api/v1/admin/dashboard:
 *   get:
 *     tags:
 *       - Dashboard
 *     summary: Admin dashboard stats
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Admin dashboard stats
 */
router.get("/admin", authenticate, authorize("da_monitoring", "admin"), dashboardController.getAdmin);

module.exports = router;
