const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

module.exports = {
    NODE_ENV: process.env.NODE_ENV || "development",
    PORT: parseInt(process.env.PORT, 10) || 3000,
    DATABASE_URL: process.env.DATABASE_URL,
    REDIS_URL: process.env.REDIS_URL || "redis://localhost:6379",
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "8h",
    FORECASTING_SERVICE_URL:
        process.env.FORECASTING_SERVICE_URL || "<http://localhost:8000>",
    CORS_ORIGIN: process.env.CORS_ORIGIN || "<http://localhost:5173>",
    LOG_LEVEL: process.env.LOG_LEVEL || "info",
};