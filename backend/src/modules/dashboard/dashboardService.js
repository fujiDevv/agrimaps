const db = require("../../config/db");

class DashboardService {
  async getPublicDashboard() {
    const latestPrices = await db.query(
      `SELECT DISTINCT ON (c.id) c.id, c.commodity_name, c.category, hp.retail_price, hp.week_start_date
       FROM commodities c JOIN historical_prices hp ON c.id = hp.commodity_id
       WHERE c.is_forecastable = true AND hp.is_outlier = false
       ORDER BY c.id, hp.week_start_date DESC`
    );

    const latestForecasts = await db.query(
      `SELECT DISTINCT ON (f.commodity_id) c.commodity_name, c.category, f.model_type, f.forecast_values, f.is_low_confidence, f.generated_at
       FROM forecasts f JOIN commodities c ON f.commodity_id = c.id
       WHERE f.forecast_horizon = 4 ORDER BY f.commodity_id, f.generated_at DESC`
    );

    const marketCount = await db.query("SELECT COUNT(*) FROM markets WHERE is_active = true AND da_monitoring = true");

    return {
      latestPrices: latestPrices.rows,
      latestForecasts: latestForecasts.rows.map((r) => ({
        ...r, forecast_values: typeof r.forecast_values === "string" ? JSON.parse(r.forecast_values) : r.forecast_values,
      })),
      totalMarkets: parseInt(marketCount.rows[0].count),
      lastUpdated: new Date().toISOString(),
    };
  }

  async getAdminDashboard() {
    const publicData = await this.getPublicDashboard();

    const pendingSubmissions = await db.query("SELECT COUNT(*) FROM submissions WHERE status = 'pending'");
    const todaySubmissions = await db.query("SELECT COUNT(*) FROM submissions WHERE submission_date = CURRENT_DATE");
    const totalForecasts = await db.query("SELECT COUNT(DISTINCT commodity_id) FROM forecasts");

    return {
      ...publicData,
      admin: {
        pendingSubmissions: parseInt(pendingSubmissions.rows[0].count),
        todaySubmissions: parseInt(todaySubmissions.rows[0].count),
        totalForecastedCommodities: parseInt(totalForecasts.rows[0].count),
      },
    };
  }
}

module.exports = new DashboardService();
