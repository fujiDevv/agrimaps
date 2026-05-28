const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../../config/db");
const authConfig = require("../../config/auth");

class AuthService {
    async login(employeeId, password) {
        const result = await db.query(
            `SELECT id, employee_id, first_name, last_name, email,
              password_hash, role, assigned_market_id, is_active
       FROM users
       WHERE employee_id = $1`,
            [employeeId]
        );

        if (result.rows.length === 0) {
            const err = new Error("Invalid credentials");
            err.statusCode = 401;
            throw err;
        }

        const user = result.rows[0];

        if (!user.is_active) {
            const err = new Error("Account is deactivated");
            err.statusCode = 403;
            throw err;
        }

        const passwordValid = await bcrypt.compare(password, user.password_hash);
        if (!passwordValid) {
            const err = new Error("Invalid credentials");
            err.statusCode = 401;
            throw err;
        }

        const token = jwt.sign(
            {
                id: user.id,
                employeeId: user.employee_id,
                role: user.role,
                assignedMarketId: user.assigned_market_id,
            },
            authConfig.jwtSecret,
            { expiresIn: authConfig.jwtExpiresIn }
        );

        // Update last login
        await db.query(
            `UPDATE users SET last_login = NOW() WHERE id = $1`,
            [user.id]
        );

        return {
            token,
            user: {
                id: user.id,
                employeeId: user.employee_id,
                firstName: user.first_name,
                lastName: user.last_name,
                email: user.email,
                role: user.role,
                assignedMarketId: user.assigned_market_id,
            },
        };
    }

    async getProfile(userId) {
        const result = await db.query(
            `SELECT id, employee_id, first_name, last_name, email, role,
              assigned_market_id, is_active, last_login, created_at
       FROM users WHERE id = $1`,
            [userId]
        );

        if (result.rows.length === 0) {
            const err = new Error("User not found");
            err.statusCode = 404;
            throw err;
        }

        return result.rows[0];
    }
}

module.exports = new AuthService();