const { Router } = require("express");
const authController = require("./authController");
const { authenticate } = require("../../middleware/authMiddleware");
const validateRequest = require("../../middleware/validateRequest");
const { loginSchema } = require("./authValidation");

const router = Router();

router.post("/login", validateRequest(loginSchema), authController.login);
router.get("/profile", authenticate, authController.getProfile);

module.exports = router;