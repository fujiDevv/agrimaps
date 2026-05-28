const db = require("../../config/db");
const logger = require("../../utils/logger");

class SubmissionService {
    /**
     * Create a new field submission with commodity price line items
     */
    async create(submitterId, marketId, items, location, deviceInfo) {
        const client = await db.getClient();

        try {
            await client.query("BEGIN");

            // Insert submission header
            const submissionResult = await client.query(
                `INSERT INTO submissions
           (submitted_by, market_id, submission_date, submission_time,
            status, latitude, longitude, device_info)
         VALUES ($1, $2, CURRENT_DATE, NOW(), 'pending', $3, $4, $5)
         RETURNING *`,
                [submitterId, marketId, location?.lat, location?.lng, deviceInfo]
            );

            const submission = submissionResult.rows[0];

            // Insert line items
            const insertedItems = [];
            for (const item of items) {
                const itemResult = await client.query(
                    `INSERT INTO submission_items
             (submission_id, commodity_id, retail_price, notes)
           VALUES ($1, $2, $3, $4)
           RETURNING *`,
                    [submission.id, item.commodityId, item.retailPrice, item.notes]
                );
                insertedItems.push(itemResult.rows[0]);
            }

            // Audit log
            await client.query(
                `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details)
         VALUES ($1, 'CREATE', 'submission', $2, $3)`,
                [
                    submitterId,
                    submission.id,
                    JSON.stringify({
                        marketId,
                        itemCount: items.length,
                    }),
                ]
            );

            await client.query("COMMIT");

            logger.info("Submission created", {
                submissionId: submission.id,
                submitterId,
                marketId,
                itemCount: items.length,
            });

            return { submission, items: insertedItems };
        } catch (err) {
            await client.query("ROLLBACK");
            throw err;
        } finally {
            client.release();
        }
    }

    /**
     * Get submissions with filters for DA monitoring personnel
     */
    async list(filters, page = 1, limit = 20) {
        const conditions = [];
        const params = [];
        let paramIndex = 1;

        if (filters.marketId) {
            conditions.push(`s.market_id = $${paramIndex++}`);
            params.push(filters.marketId);
        }

        if (filters.status) {
            conditions.push(`s.status = $${paramIndex++}`);
            params.push(filters.status);
        }

        if (filters.dateFrom) {
            conditions.push(`s.submission_date >= $${paramIndex++}`);
            params.push(filters.dateFrom);
        }

        if (filters.dateTo) {
            conditions.push(`s.submission_date <= $${paramIndex++}`);
            params.push(filters.dateTo);
        }

        if (filters.submittedBy) {
            conditions.push(`s.submitted_by = $${paramIndex++}`);
            params.push(filters.submittedBy);
        }

        const whereClause =
            conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

        const countResult = await db.query(
            `SELECT COUNT(*) FROM submissions s ${whereClause}`,
            params
        );
        const total = parseInt(countResult.rows[0].count, 10);

        const offset = (page - 1) * limit;
        const dataResult = await db.query(
            `SELECT s.*,
              m.market_name, m.city,
              u.first_name || ' ' || u.last_name AS submitter_name,
              (SELECT COUNT(*) FROM submission_items si WHERE si.submission_id = s.id) AS item_count
       FROM submissions s
       JOIN markets m ON s.market_id = m.id
       JOIN users u ON s.submitted_by = u.id
       ${whereClause}
       ORDER BY s.submission_date DESC, s.submission_time DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
            [...params, limit, offset]
        );

        return { data: dataResult.rows, total, page, limit };
    }

    /**
     * Validate or reject a submission (DA monitoring personnel)
     */
    async validate(submissionId, validatorId, status, rejectionReason) {
        const validTransitions = {
            validated: ["pending"],
            rejected: ["pending"],
        };

        if (!validTransitions[status]) {
            const err = new Error("Invalid status transition");
            err.statusCode = 400;
            throw err;
        }

        const result = await db.query(
            `UPDATE submissions
       SET status = $1, validated_by = $2, validated_at = NOW(),
           rejection_reason = $3, updated_at = NOW()
       WHERE id = $4 AND status = 'pending'
       RETURNING *`,
            [status, validatorId, rejectionReason, submissionId]
        );

        if (result.rows.length === 0) {
            const err = new Error("Submission not found or already processed");
            err.statusCode = 404;
            throw err;
        }

        // If validated, ingest into historical_prices
        if (status === "validated") {
            await this._ingestToHistorical(submissionId);
        }

        return result.rows[0];
    }

    /**
     * Move validated submission data into historical_prices
     */
    async _ingestToHistorical(submissionId) {
        await db.query(
            `INSERT INTO historical_prices
         (commodity_id, market_id, week_start_date, week_end_date,
          week_number, year, retail_price, data_source)
       SELECT
         si.commodity_id,
         s.market_id,
         DATE_TRUNC('week', s.submission_date)::DATE,
         (DATE_TRUNC('week', s.submission_date) + INTERVAL '6 days')::DATE,
         EXTRACT(WEEK FROM s.submission_date),
         EXTRACT(YEAR FROM s.submission_date),
         si.retail_price,
         'field_submission'
       FROM submission_items si
       JOIN submissions s ON si.submission_id = s.id
       WHERE s.id = $1
       ON CONFLICT (commodity_id, market_id, week_start_date)
       DO UPDATE SET retail_price = EXCLUDED.retail_price`,
            [submissionId]
        );
    }
}

module.exports = new SubmissionService();