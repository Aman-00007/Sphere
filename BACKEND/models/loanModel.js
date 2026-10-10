import pool from "../db.js";

export const loanModel = {
    // 1. Create a new loan application
    async create(data) {
        const query = `
            INSERT INTO financial_profiles (
                application_id, user_id, bank_id, bank_name, loan_type, 
                loan_amount, tenure_months, interest_rate, emi_amount, purpose, 
                employment_status, annual_income, existing_emi, ongoing_stats
            ) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            RETURNING *;
        `;
        const values = [
            data.application_id,
            data.user_id,
            data.bank_id,
            data.bank_name,
            data.loan_type,
            data.loan_amount,
            data.tenure_months,
            data.interest_rate,
            data.emi_amount,
            data.purpose,
            data.employment_status,
            data.annual_income,
            data.existing_emi,
            data.ongoing_stats
        ];

        const result = await pool.query(query, values);
        return result.rows[0];
    },

    // 2. Find all applications for a user 
    async findByUserId(userId) {
        const result = await pool.query(`SELECT * FROM financial_profiles WHERE user_id = $1`, [userId]);
        return result.rows;
    },

    // 3. Find single application by Application id
    async findByApplicationId(applicationId) {
        const result = await pool.query(`
            SELECT fp.*, u.first_name, u.last_name, u.email, u.phone_number, u.credit_score, u.pan_number, u.monthly_income, u.employment_type
            FROM financial_profiles fp
            JOIN users u ON fp.user_id = u.id
            WHERE fp.application_id = $1`,
            [applicationId]
        );
        return result.rows[0];
    },

    // 4. Update application status
    async updateStatus(applicationId, status, ongoingStats = null) {
        let query = "UPDATE financial_profiles SET status = $1, updated_at = CURRENT_TIMESTAMP ";
        const params = [status];

        if (ongoingStats) {
            params.push(JSON.stringify(ongoingStats));
            query += `, ongoing_stats = $${params.length}`;
        }

        params.push(applicationId);
        query += ` WHERE application_id = $${params.length} RETURNING *`;

        const result = await pool.query(query, params);
        return result.rows[0];
    },

    // 5. Update Ongoing Repayment Stats (e.g. after EMI payment)
    async updateOngoingStats(applicationId, stats) {
        const result = await pool.query(
            `UPDATE financial_profiles SET ongoing_stats = $1, updated_at = CURRENT_TIMESTAMP WHERE application_id = $2 RETURNING *`,
            [JSON.stringify(stats), applicationId]
        );
        return result.rows[0];
    }
};