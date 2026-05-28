const marketService = require("./marketService");
const { success } = require("../../utils/responseFormatter");

class MarketController {
  async list(req, res, next) {
    try {
      const data = await marketService.list(req.query.city);
      return success(res, data);
    } catch (err) { next(err); }
  }

  async getGeoJSON(req, res, next) {
    try {
      const data = await marketService.getGeoJSON(req.query.city);
      return success(res, data);
    } catch (err) { next(err); }
  }
}

module.exports = new MarketController();
