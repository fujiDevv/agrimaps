const winston = require("winston");
const env = require("../config/env");

const logger = winston.createLogger({
    level: env.LOG_LEVEL,
    format: winston.format.combine(
        winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    defaultMeta: { service: "agrimaps-backend" },
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.printf(({ timestamp, level, message, ...meta }) => {
                    const metaStr = Object.keys(meta).length > 1
                        ? JSON.stringify(meta, null, 2)
                        : "";
                    return `${timestamp} [${level}]: ${message} ${metaStr}`;
                })
            ),
        }),
        new winston.transports.File({
            filename: "logs/error.log",
            level: "error",
            maxsize: 5242880,
            maxFiles: 5,
        }),
        new winston.transports.File({
            filename: "logs/combined.log",
            maxsize: 5242880,
            maxFiles: 5,
        }),
    ],
});

module.exports = logger;