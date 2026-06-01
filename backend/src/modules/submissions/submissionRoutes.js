const { Router } = require("express");
const submissionController = require("./submissionController");
const { authenticate, authorize } = require("../../middleware/authMiddleware");
const validateRequest = require("../../middleware/validateRequest");
const {
    createSubmissionSchema,
    validateSubmissionSchema,
} = require("./submissionValidation");

const router = Router();

// All submission routes require authentication
router.use(authenticate);

// DA field personnel: create submissions
/**
 * @openapi
 * /api/v1/submissions:
 *   post:
 *     tags:
 *       - Submissions
 *     summary: Create a price submission
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               marketId:
 *                 type: string
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     commodityId:
 *                       type: string
 *                     retailPrice:
 *                       type: number
 *               location:
 *                 type: object
 *                 properties:
 *                   lat:
 *                     type: number
 *                   lng:
 *                     type: number
 *     responses:
 *       201:
 *         description: Submission created
 */
router.post(
    "/",
    authorize("da_field", "da_monitoring", "admin"),
    validateRequest(createSubmissionSchema),
    submissionController.create
);

// DA monitoring + admin: list and validate submissions
/**
 * @openapi
 * /api/v1/submissions:
 *   get:
 *     tags:
 *       - Submissions
 *     summary: List submissions
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of submissions
 */
router.get(
    "/",
    authorize("da_monitoring", "admin"),
    submissionController.list
);

/**
 * @openapi
 * /api/v1/submissions/{id}/validate:
 *   patch:
 *     tags:
 *       - Submissions
 *     summary: Validate or reject submission
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 example: validated
 *     responses:
 *       200:
 *         description: Submission validated
 */
router.patch(
    "/:id/validate",
    authorize("da_monitoring", "admin"),
    validateRequest(validateSubmissionSchema),
    submissionController.validate
);

module.exports = router;