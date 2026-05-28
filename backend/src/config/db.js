const { Pool } = require("pg");
const env = require("./env");
const logger = require("../utils/logger");

const pool = new Pool({
    connectionString: env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});

pool.on("error", (err) => {
    logger.error("Unexpected PostgreSQL pool error", { error: err.message });
});

pool.on("connect", () => {
    logger.debug("New PostgreSQL client connected");
});

/**
 * Execute a parameterized query
 */
async function query(text, params) {
    const start = Date.now();
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    if (duration > 500) {
        logger.warn("Slow query detected", { text, duration: `${duration}ms` });
    }
    return result;
}

/**
 * Get a dedicated client for transactions
 */
async function getClient() {
    return pool.connect();
}

module.exports = { pool, query, getClient };