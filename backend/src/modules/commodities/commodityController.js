const commodityService = require("./commodityService");
const { success } = require("../../utils/responseFormatter");

class CommodityController {
  async list(req, res, next) {
    try {
      const { category, forecastableOnly } = req.query;
      const data = await commodityService.list(category, forecastableOnly === "true");
      return success(res, data);
    } catch (err) { next(err); }
  }

  async getLatestPrices(req, res, next) {
    try {
      const { category } = req.query;
      const data = await commodityService.getLatestPrices(category);
      return success(res, data);
    } catch (err) { next(err); }
  }

  async getPriceTrend(req, res, next) {
    try {
      const { id } = req.params;
      const { weeks } = req.query;
      const data = await commodityService.getPriceTrend(id, parseInt(weeks) || 26);
      return success(res, data);
    } catch (err) { next(err); }
  }
}

module.exports = new CommodityController();
