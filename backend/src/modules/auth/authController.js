const authService = require("./authService");
const { success } = require("../../utils/responseFormatter");
const logger = require("../../utils/logger");

class AuthController {
    async login(req, res, next) {
        try {
            const { employeeId, password } = req.body;
            const result = await authService.login(employeeId, password);

            logger.info("User logged in", {
                userId: result.user.id,
                role: result.user.role,
            });

            return success(res, result, "Login successful");
        } catch (err) {
            next(err);
        }
    }

    async getProfile(req, res, next) {
        try {
            const profile = await authService.getProfile(req.user.id);
            return success(res, profile);
        } catch (err) {
            next(err);
        }
    }
}

module.exports = new AuthController();