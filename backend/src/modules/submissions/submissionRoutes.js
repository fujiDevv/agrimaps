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
router.post(
    "/",
    authorize("da_field", "da_monitoring", "admin"),
    validateRequest(createSubmissionSchema),
    submissionController.create
);

// DA monitoring + admin: list and validate submissions
router.get(
    "/",
    authorize("da_monitoring", "admin"),
    submissionController.list
);

router.patch(
    "/:id/validate",
    authorize("da_monitoring", "admin"),
    validateRequest(validateSubmissionSchema),
    submissionController.validate
);

module.exports = router;