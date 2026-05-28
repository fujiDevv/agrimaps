const reportService = require("./reportService");
const { success } = require("../../utils/responseFormatter");

class ReportController {
  async submissionProgress(req, res, next) {
    try {
      const { dateFrom, dateTo } = req.query;
      const data = await reportService.getSubmissionProgress(dateFrom, dateTo);
      return success(res, data);
    } catch (err) { next(err); }
  }

  async marketCoverage(req, res, next) {
    try {
      const data = await reportService.getMarketCoverage();
      return success(res, data);
    } catch (err) { next(err); }
  }

  async priceTrend(req, res, next) {
    try {
      const { category, weeks } = req.query;
      const data = await reportService.getPriceTrendReport(category, parseInt(weeks) || 12);
      return success(res, data);
    } catch (err) { next(err); }
  }
}

module.exports = new ReportController();
