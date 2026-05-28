const logger = require("../utils/logger");

function errorHandler(err, req, res, _next) {
    logger.error("Unhandled error", {
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        userId: req.user?.id,
    });

    if (err.code === "23505") {
        return res.status(409).json({
            success: false,
            message: "Duplicate entry — this record already exists",
        });
    }

    if (err.code === "23503") {
        return res.status(400).json({
            success: false,
            message: "Referenced record not found",
        });
    }

    const statusCode = err.statusCode || 500;
    const message =
        statusCode === 500 ? "Internal server error" : err.message;

    res.status(statusCode).json({
        success: false,
        message,
    });
}

module.exports = errorHandler;