import pool from "../db.js";

export const loanModel = {

    // Create a new loan application

    async create(data) {

    },

    //Find all application for a user 

    async findByUserId(userId) {

    },

    //Find single application by Apllication id

    async findByApplicationId(applicationId) {
        const result = await pool.query(`
            SELECT fp.*,u.first_name,u.last_name,u.email, u.phone_number,u.credit_score, u.pan_number,u.monthly_income,u.employment_type
            FROM financial_profiles fp
            JOIN users u ON fp.user_id = u.id
            WHERE fp.application_id = $1`,
            [applicationId]);
        return result.rows[0];

    },

    //Update application status

    async updateStatus(applicationId, status, ongoingStats = null) {
        let query = "UPDATE financial_profiles SET status = $1, updated_at = CURRENT_TIMESTAMP ";
        const params = [status];

        if (ongoingStats) {
            params.push(JSON.stringify(ongoingStats));

            query += `, ongoing_stats = $${params.length}`;
        }

        params.push(applicationId);
        query += `WHERE application_id = $${params.length} RETURNING *`;

        const result = await pool.query(query, params);
        return result.rows[0];
    },

    // Update Ongoing Repayment Stats (e.g. after EMI payment)

    updateOngoingStats: async (applicationId, stats) => {
        const result = await pool.query(
            `UPDATE financial_profiles SET ongoing_stats = $1, updated_at = CURRENT_TIMESTAMP WHERE application_id = $2 RETURNING *`,
            [JSON.stringify(stats), applicationId]
        );
        return result.rows[0];
    },
};