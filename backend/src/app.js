const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const env = require("./config/env");
const errorHandler = require("./middleware/errorHandler");

// Route imports
const authRoutes = require("./modules/auth/authRoutes");
const submissionRoutes = require("./modules/submissions/submissionRoutes");
const commodityRoutes = require("./modules/commodities/commodityRoutes");
const marketRoutes = require("./modules/markets/marketRoutes");
const forecastRoutes = require("./modules/forecasts/forecastRoutes");
const reportRoutes = require("./modules/reports/reportRoutes");
const dashboardRoutes = require("./modules/dashboard/dashboardRoutes");

const app = express();

// ── Security ──────────────────────────────────────────
app.use(helmet());
app.use(
    cors({
        origin: env.CORS_ORIGIN.split(",").map((o) => o.trim()),
        credentials: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
        allowedHeaders: ["Content-Type", "Authorization"],
    })
);

// ── Rate limiting ─────────────────────────────────────
const publicLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many requests. Try again later." },
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { success: false, message: "Too many login attempts." },
});

// ── Body parsing & middleware ─────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(compression());
app.use(morgan("combined"));

// ── Health check ──────────────────────────────────────
app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        message: "Agrimaps API is running",
        timestamp: new Date().toISOString(),
        version: "1.0.0",
    });
});

// ── Public routes (no authentication) ─────────────────
app.use("/api/v1/auth", authLimiter, authRoutes);

// Public-facing endpoints for consumers and vendors
app.use("/api/v1/public/commodities", publicLimiter, commodityRoutes);
app.use("/api/v1/public/markets", publicLimiter, marketRoutes);
app.use("/api/v1/public/forecasts", publicLimiter, forecastRoutes);
app.use("/api/v1/public/dashboard", publicLimiter, dashboardRoutes);

// ── Authenticated routes (DA personnel only) ──────────
app.use("/api/v1/submissions", submissionRoutes);
app.use("/api/v1/admin/commodities", commodityRoutes);
app.use("/api/v1/admin/markets", marketRoutes);
app.use("/api/v1/admin/forecasts", forecastRoutes);
app.use("/api/v1/admin/reports", reportRoutes);
app.use("/api/v1/admin/dashboard", dashboardRoutes);

// ── Error handling ────────────────────────────────────
app.use(errorHandler);

module.exports = app;