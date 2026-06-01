const swaggerJsdoc = require("swagger-jsdoc");
const env = require("./env");

const options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "Agrimaps Backend API",
            version: "1.0.0",
            description: "API Documentation for the Agrimaps Node.js Backend",
        },
        servers: [
            {
                url: `http://localhost:${env.PORT || 3000}`,
                description: "Development Server",
            },
        ],
        components: {
            securitySchemes: {
                BearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT",
                },
            },
        },
        security: [
            {
                BearerAuth: [],
            },
        ],
    },
    apis: [
        "./src/modules/**/*.js",
        "./src/app.js"
    ], // Path to the API docs
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
