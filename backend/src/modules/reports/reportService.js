const db = require("../../config/db");

class ReportService {
  async getSubmissionProgress(dateFrom, dateTo) {
    const result = await db.query(
      `SELECT * FROM collection_progress WHERE submission_date BETWEEN $1 AND $2 ORDER BY submission_date DESC`,
      [dateFrom, dateTo]
    );
    return result.rows;
  }

  async getMarketCoverage() {
    const result = await db.query("SELECT * FROM market_coverage ORDER BY city, market_name");
    return result.rows;
  }

  async getPriceTrendReport(category, weeks = 12) {
    const result = await db.query(
      `SELECT c.id, c.commodity_name, c.category, json_agg(json_build_object('date', hp.week_start_date, 'price', hp.retail_price) ORDER BY hp.week_start_date) AS trend
       FROM commodities c JOIN historical_prices hp ON c.id = hp.commodity_id
       WHERE c.category = $1 AND hp.week_start_date >= CURRENT_DATE - ($2 || ' weeks')::INTERVAL AND hp.is_outlier = false
       GROUP BY c.id, c.commodity_name, c.category ORDER BY c.commodity_name`,
      [category, weeks]
    );
    return result.rows;
  }
}

module.exports = new ReportService();
