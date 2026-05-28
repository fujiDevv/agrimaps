const jwt = require("jsonwebtoken");
const authConfig = require("../config/auth");

/**
 * Verify JWT and attach user to req
 */
function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            success: false,
            message: "Authentication token required",
        });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, authConfig.jwtSecret);
        req.user = decoded;
        next();
    } catch (err) {
        if (err.name === "TokenExpiredError") {
            return res.status(401).json({
                success: false,
                message: "Token expired",
            });
        }
        return res.status(401).json({
            success: false,
            message: "Invalid token",
        });
    }
}

/**
 * Restrict access based on role(s)
 */
function authorize(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Authentication required",
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: "Insufficient permissions",
            });
        }

        next();
    };
}

module.exports = { authenticate, authorize };