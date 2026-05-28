const dashboardService = require("./dashboardService");
const { success } = require("../../utils/responseFormatter");

class DashboardController {
  async getPublic(req, res, next) {
    try {
      const data = await dashboardService.getPublicDashboard();
      return success(res, data);
    } catch (err) { next(err); }
  }

  async getAdmin(req, res, next) {
    try {
      const data = await dashboardService.getAdminDashboard();
      return success(res, data);
    } catch (err) { next(err); }
  }
}

module.exports = new DashboardController();
