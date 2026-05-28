/**
 * Generic Joi validation middleware factory
 */
function validateRequest(schema, property = "body") {
    return (req, res, next) => {
        const { error, value } = schema.validate(req[property], {
            abortEarly: false,
            stripUnknown: true,
        });

        if (error) {
            const errors = error.details.map((d) => ({
                field: d.path.join("."),
                message: d.message,
            }));
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors,
            });
        }

        req[property] = value;
        next();
    };
}

module.exports = validateRequest;