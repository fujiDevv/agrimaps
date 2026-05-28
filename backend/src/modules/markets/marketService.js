const db = require("../../config/db");

class MarketService {
    /**
     * Get all NCR markets with coordinates for WebGIS
     */
    async list(city) {
        const conditions = ["is_active = true"];
        const params = [];
        let paramIdx = 1;

        if (city) {
            conditions.push(`city = $${paramIdx++}`);
            params.push(city);
        }

        const result = await db.query(
            `SELECT id, market_name, market_code, city, region,
              latitude, longitude, address, da_monitoring
       FROM markets
       WHERE ${conditions.join(" AND ")}
       ORDER BY city, market_name`,
            params
        );

        return result.rows;
    }

    /**
     * Get GeoJSON FeatureCollection for WebGIS rendering
     */
    async getGeoJSON(city) {
        const conditions = ["is_active = true"];
        const params = [];
        let paramIdx = 1;

        if (city) {
            conditions.push(`city = $${paramIdx++}`);
            params.push(city);
        }

        const result = await db.query(
            `SELECT
         json_build_object(
           'type', 'FeatureCollection',
           'features', json_agg(
             json_build_object(
               'type', 'Feature',
               'geometry', ST_AsGeoJSON(geom)::json,
               'properties', json_build_object(
                 'id', id,
                 'market_name', market_name,
                 'market_code', market_code,
                 'city', city,
                 'address', address,
                 'da_monitoring', da_monitoring
               )
             )
           )
         ) AS geojson
       FROM markets
       WHERE ${conditions.join(" AND ")}`,
            params
        );

        return result.rows[0]?.geojson || { type: "FeatureCollection", features: [] };
    }

    /**
     * Get current prices per market (for market pins)
     * Returns market-level price data when available,
     * NCR aggregate otherwise
     */
    async getMarketPrices(marketId, commodityId) {
        // Attempt per-market prices first
        const result = await db.query(
            `SELECT hp.retail_price, hp.week_start_date,
              c.commodity_name, c.category
       FROM historical_prices hp
       JOIN commodities c ON hp.commodity_id = c.id
       WHERE hp.market_id = $1
         AND hp.commodity_id = $2
       ORDER BY hp.week_start_date DESC
       LIMIT 4`,
            [marketId, commodityId]
        );

        if (result.rows.length > 0) {
            return { type: "market_specific", data: result.rows };
        }

        // Fall back to NCR aggregate
        const aggregateResult = await db.query(
            `SELECT AVG(hp.retail_price) AS avg_price,
              MIN(hp.retail_price) AS min_price,
              MAX(hp.retail_price) AS max_price,
              hp.week_start_date,
              c.commodity_name, c.category
       FROM historical_prices hp
       JOIN commodities c ON hp.commodity_id = c.id
       WHERE hp.commodity_id = $1
         AND hp.market_id IS NULL
       GROUP BY hp.week_start_date, c.commodity_name, c.category
       ORDER BY hp.week_start_date DESC
       LIMIT 4`,
            [commodityId]
        );

        return { type: "ncr_aggregate", data: aggregateResult.rows };
    }
}

module.exports = new MarketService();