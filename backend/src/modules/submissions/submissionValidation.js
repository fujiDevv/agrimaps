const Joi = require("joi");

const createSubmissionSchema = Joi.object({
    marketId: Joi.string().uuid().required(),
    items: Joi.array()
        .items(
            Joi.object({
                commodityId: Joi.string().uuid().required(),
                retailPrice: Joi.number().positive().precision(2).required(),
                notes: Joi.string().max(500).allow("", null),
            })
        )
        .min(1)
        .max(100)
        .required(),
    location: Joi.object({
        lat: Joi.number().min(-90).max(90),
        lng: Joi.number().min(-180).max(180),
    }).allow(null),
    deviceInfo: Joi.object().allow(null),
});

const validateSubmissionSchema = Joi.object({
    status: Joi.string().valid("validated", "rejected").required(),
    rejectionReason: Joi.string()
        .max(1000)
        .when("status", {
            is: "rejected",
            then: Joi.required(),
            otherwise: Joi.allow("", null),
        }),
});

module.exports = { createSubmissionSchema, validateSubmissionSchema };