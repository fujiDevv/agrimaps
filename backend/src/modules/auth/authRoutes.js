const { Router } = require("express");
const authController = require("./authController");
const { authenticate } = require("../../middleware/authMiddleware");
const validateRequest = require("../../middleware/validateRequest");
const { loginSchema } = require("./authValidation");

const router = Router();

/**
 * @openapi
 * /api/v1/auth/login:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Login and receive JWT
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - employeeId
 *               - password
 *             properties:
 *               employeeId:
 *                 type: string
 *                 example: DA-ADMIN-001
 *               password:
 *                 type: string
 *                 example: Admin@2025
 *     responses:
 *       200:
 *         description: Login successful
 */
router.post("/login", validateRequest(loginSchema), authController.login);

/**
 * @openapi
 * /api/v1/auth/profile:
 *   get:
 *     tags:
 *       - Auth
 *     summary: Get authenticated user profile
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved
 */
router.get("/profile", authenticate, authController.getProfile);

module.exports = router;