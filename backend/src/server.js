const app = require("./app");
const env = require("./config/env");
const logger = require("./utils/logger");
const { pool } = require("./config/db");

const server = app.listen(env.PORT, () => {
    logger.info(`Agrimaps backend running on port ${env.PORT}`, {
        environment: env.NODE_ENV,
    });
});

// Graceful shutdown
async function shutdown(signal) {
    logger.info(`${signal} received — shutting down gracefully`);
    server.close(async () => {
        await pool.end();
        logger.info("PostgreSQL pool closed");
        process.exit(0);
    });
    setTimeout(() => {
        logger.error("Forced shutdown after timeout");
        process.exit(1);
    }, 10000);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled promise rejection", { reason: String(reason) });
});