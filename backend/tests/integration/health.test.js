const request = require("supertest");
const app = require("../../src/app");

describe("Health Check API", () => {
    it("should return 200 and health status", async () => {
        const response = await request(app).get("/api/health");
        
        expect(response.statusCode).toBe(200);
        expect(response.body).toHaveProperty("success", true);
        expect(response.body).toHaveProperty("message", "Agrimaps API is running");
        expect(response.body).toHaveProperty("timestamp");
        expect(response.body).toHaveProperty("version", "1.0.0");
    });
});
