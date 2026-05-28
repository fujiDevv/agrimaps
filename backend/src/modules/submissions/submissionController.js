const submissionService = require("./submissionService");
const { success, paginated } = require("../../utils/responseFormatter");

class SubmissionController {
    async create(req, res, next) {
        try {
            const { marketId, items, location, deviceInfo } = req.body;
            const result = await submissionService.create(
                req.user.id,
                marketId,
                items,
                location,
                deviceInfo
            );
            return success(res, result, "Submission created", 201);
        } catch (err) {
            next(err);
        }
    }

    async list(req, res, next) {
        try {
            const { page, limit, marketId, status, dateFrom, dateTo, submittedBy } =
                req.query;
            const result = await submissionService.list(
                { marketId, status, dateFrom, dateTo, submittedBy },
                parseInt(page, 10) || 1,
                parseInt(limit, 10) || 20
            );
            return paginated(
                res,
                result.data,
                result.total,
                result.page,
                result.limit
            );
        } catch (err) {
            next(err);
        }
    }

    async validate(req, res, next) {
        try {
            const { id } = req.params;
            const { status, rejectionReason } = req.body;
            const result = await submissionService.validate(
                id,
                req.user.id,
                status,
                rejectionReason
            );
            return success(res, result, `Submission ${status}`);
        } catch (err) {
            next(err);
        }
    }
}

module.exports = new SubmissionController();