const Joi = require("joi");

const loginSchema = Joi.object({
    employeeId: Joi.string().trim().required().messages({
        "string.empty": "Employee ID is required",
        "any.required": "Employee ID is required",
    }),
    password: Joi.string().min(8).required().messages({
        "string.min": "Password must be at least 8 characters",
        "any.required": "Password is required",
    }),
});

module.exports = { loginSchema };