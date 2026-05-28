const forecastService = require("./forecastService");
const { success } = require("../../utils/responseFormatter");

class ForecastController {
  async generate(req, res, next) {
    try {
      const { commodityId } = req.params;
      const { horizon } = req.body;
      const result = await forecastService.generateForecast(commodityId, horizon || 4, req.user.id);
      return success(res, result, "Forecast generated", 201);
    } catch (err) { next(err); }
  }

  async getLatest(req, res, next) {
    try {
      const { commodityId } = req.params;
      const { horizon } = req.query;
      const data = await forecastService.getLatestForecast(commodityId, parseInt(horizon) || 4);
      if (!data) return res.status(404).json({ success: false, message: "No forecast available" });
      return success(res, data);
    } catch (err) { next(err); }
  }

  async getAllLatest(req, res, next) {
    try {
      const { horizon } = req.query;
      const data = await forecastService.getAllLatestForecasts(parseInt(horizon) || 4);
      return success(res, data);
    } catch (err) { next(err); }
  }
}

module.exports = new ForecastController();
