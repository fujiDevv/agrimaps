const db = require("../../config/db");

class CommodityService {
    /**
     * Get all commodities with optional category filter
     * Used by both public and admin routes
     */
    async list(category, forecastableOnly = false) {
        const conditions = [];
        const params = [];
        let paramIndex = 1;

        if (category) {
            conditions.push(`category = $${paramIndex++}`);
            params.push(category);
        }

        if (forecastableOnly) {
            conditions.push(`is_forecastable = true`);
        }

        const whereClause =
            conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

        const result = await db.query(
            `SELECT id, commodity_name, canonical_name, category, subcategory,
              unit_of_measure, is_imported, is_forecastable,
              data_start_year, fill_rate, coefficient_of_variation
       FROM commodities
       ${whereClause}
       ORDER BY category, commodity_name`,
            params
        );

        return result.rows;
    }

    /**
     * Get latest price summary per commodity across NCR
     * Public-facing for consumers and vendors
     */
    async getLatestPrices(category) {
        const conditions = ["hp.is_outlier = false"];
        const params = [];
        let paramIndex = 1;

        if (category) {
            conditions.push(`c.category = $${paramIndex++}`);
            params.push(category);
        }

        const whereClause = conditions.join(" AND ");

        const result = await db.query(
            `SELECT DISTINCT ON (c.id)
              c.id, c.commodity_name, c.category, c.unit_of_measure,
              hp.retail_price,
              hp.week_start_date AS price_date,
              LAG(hp.retail_price) OVER (
                PARTITION BY c.id ORDER BY hp.week_start_date
              ) AS previous_price,
              hp.retail_price - LAG(hp.retail_price) OVER (
                PARTITION BY c.id ORDER BY hp.week_start_date
              ) AS price_change
       FROM commodities c
       JOIN historical_prices hp ON c.id = hp.commodity_id
       WHERE ${whereClause}
       ORDER BY c.id, hp.week_start_date DESC`,
            params
        );

        return result.rows.map((row) => ({
            ...row,
            priceChangePercent: row.previous_price
                ? ((row.price_change / row.previous_price) * 100).toFixed(2)
                : null,
            direction:
                row.price_change > 0
                    ? "increasing"
                    : row.price_change < 0
                        ? "decreasing"
                        : "stable",
        }));
    }

    /**
     * Get price trend for a specific commodity
     */
    async getPriceTrend(commodityId, weeks = 26) {
        const result = await db.query(
            `SELECT week_start_date, retail_price, is_imputed, is_outlier
       FROM historical_prices
       WHERE commodity_id = $1
         AND week_start_date >= CURRENT_DATE - ($2 || ' weeks')::INTERVAL
       ORDER BY week_start_date ASC`,
            [commodityId, weeks]
        );

        return result.rows;
    }
}

module.exports = new CommodityService();