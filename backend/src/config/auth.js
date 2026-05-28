const env = require("./env");

module.exports = {
    jwtSecret: env.JWT_SECRET,
    jwtExpiresIn: env.JWT_EXPIRES_IN,
    saltRounds: 12,
    roles: {
        ADMIN: "admin",
        DA_MONITORING: "da_monitoring",
        DA_FIELD: "da_field",
    },
    roleHierarchy: {
        admin: ["admin", "da_monitoring", "da_field"],
        da_monitoring: ["da_monitoring", "da_field"],
        da_field: ["da_field"],
    },
};