const axios = require("axios");
const db = require("../../config/db");
const env = require("../../config/env");
const logger = require("../../utils/logger");

class ForecastService {
    constructor() {
        this.forecastClient = axios.create({
            baseURL: env.FORECASTING_SERVICE_URL,
            timeout: 120000, // 2 minutes — forecasting can be slow
            headers: { "Content-Type": "application/json" },
        });
    }

    /**
     * Trigger forecast generation for a commodity via Python microservice
     */
    async generateForecast(commodityId, horizon = 4, userId) {
        // Fetch historical data for the commodity
        const historyResult = await db.query(
            `SELECT week_start_date, retail_price
       FROM historical_prices
       WHERE commodity_id = $1
         AND is_outlier = false
       ORDER BY week_start_date ASC`,
            [commodityId]
        );

        if (historyResult.rows.length < 52) {
            const err = new Error(
                "Insufficient historical data (minimum 1 year / 52 weekly observations required)"
            );
            err.statusCode = 400;
            throw err;
        }

        const commodityResult = await db.query(
            `SELECT canonical_name, category FROM commodities WHERE id = $1`,
            [commodityId]
        );
        const commodity = commodityResult.rows[0];

        const priceSeries = historyResult.rows.map((r) => ({
            date: r.week_start_date,
            price: parseFloat(r.retail_price),
        }));

        // Call Python forecasting microservice
        const response = await this.forecastClient.post("/api/forecast", {
            commodity_id: commodityId,
            commodity_name: commodity.canonical_name,
            category: commodity.category,
            price_series: priceSeries,
            horizon_weeks: horizon,
        });

        const forecastData = response.data;

        // Store forecast in database
        const result = await db.query(
            `INSERT INTO forecasts
         (commodity_id, model_type, model_parameters, forecast_horizon,
          forecast_values, confidence_level, rmse, mae, mape,
          aic, bic, is_low_confidence, confidence_reason,
          training_data_start, training_data_end, generated_at, generated_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), $16)
       RETURNING *`,
            [
                commodityId,
                forecastData.model_type,
                JSON.stringify(forecastData.model_parameters),
                horizon,
                JSON.stringify(forecastData.forecast_values),
                forecastData.confidence_level,
                forecastData.metrics?.rmse,
                forecastData.metrics?.mae,
                forecastData.metrics?.mape,
                forecastData.model_parameters?.aic,
                forecastData.model_parameters?.bic,
                forecastData.is_low_confidence || false,
                forecastData.confidence_reason || null,
                forecastData.training_start,
                forecastData.training_end,
                userId,
            ]
        );

        logger.info("Forecast generated", {
            commodityId,
            modelType: forecastData.model_type,
            horizon,
            rmse: forecastData.metrics?.rmse,
        });

        return result.rows[0];
    }

    /**
     * Get latest forecast for a commodity (public-facing)
     */
    async getLatestForecast(commodityId, horizon = 4) {
        const result = await db.query(
            `SELECT f.*, c.commodity_name, c.category
       FROM forecasts f
       JOIN commodities c ON f.commodity_id = c.id
       WHERE f.commodity_id = $1
         AND f.forecast_horizon = $2
       ORDER BY f.generated_at DESC
       LIMIT 1`,
            [commodityId, horizon]
        );

        if (result.rows.length === 0) {
            return null;
        }

        const forecast = result.rows[0];

        return {
            ...forecast,
            model_parameters: typeof forecast.model_parameters === "string"
                ? JSON.parse(forecast.model_parameters)
                : forecast.model_parameters,
            forecast_values: typeof forecast.forecast_values === "string"
                ? JSON.parse(forecast.forecast_values)
                : forecast.forecast_values,
        };
    }

    /**
     * Get all latest forecasts for dashboard display
     */
    async getAllLatestForecasts(horizon = 4) {
        const result = await db.query(
            `SELECT DISTINCT ON (f.commodity_id)
              f.*, c.commodity_name, c.category
       FROM forecasts f
       JOIN commodities c ON f.commodity_id = c.id
       WHERE f.forecast_horizon = $1
       ORDER BY f.commodity_id, f.generated_at DESC`,
            [horizon]
        );

        return result.rows.map((row) => ({
            ...row,
            model_parameters:
                typeof row.model_parameters === "string"
                    ? JSON.parse(row.model_parameters)
                    : row.model_parameters,
            forecast_values:
                typeof row.forecast_values === "string"
                    ? JSON.parse(row.forecast_values)
                    : row.forecast_values,
        }));
    }

    /**
     * Batch trigger forecasts for all forecastable commodities
     * Typically run on a schedule (e.g., weekly via node-cron)
     */
    async batchGenerateForecasts(userId) {
        const commodities = await db.query(
            `SELECT id, canonical_name FROM commodities WHERE is_forecastable = true`
        );

        const results = [];
        const errors = [];

        for (const commodity of commodities.rows) {
            try {
                // Generate both 4-week and 13-week forecasts
                const f4 = await this.generateForecast(commodity.id, 4, userId);
                const f13 = await this.generateForecast(commodity.id, 13, userId);
                results.push({
                    commodityId: commodity.id,
                    commodityName: commodity.canonical_name,
                    forecasts: [f4, f13],
                });
            } catch (err) {
                logger.error("Forecast generation failed", {
                    commodityId: commodity.id,
                    error: err.message,
                });
                errors.push({
                    commodityId: commodity.id,
                    commodityName: commodity.canonical_name,
                    error: err.message,
                });
            }
        }

        logger.info("Batch forecast complete", {
            successful: results.length,
            failed: errors.length,
        });

        return { results, errors };
    }
}

module.exports = new ForecastService();