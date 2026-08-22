/**
 * Manages Banker queries on missing/inadequate documents 
 * and applicant resolutions.
 */

import pool from "../db.js";

export const queryModel = {
    // 1. Admin create query for missing infromation or documents

    async createQuery(data) {
        const {
            application_id,
            user_id,
            admin_id,
            query_title,
            query_details,
            missing_items } = data;

        const result = await pool.query(
            ` INSERT INTO admin_queries (
                        application_id,
                        user_id,
                        admin_id,
                        query_title,
                        query_details,
                        missing_items,
                        is_resolved)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                    RETURNING *
                `,
            [application_id,
                user_id,
                admin_id,
                query_title,
                query_details,
                missing_items,
                false]
        );
        return result.rows[0];
    },

    // 2. Find all queries for a specific user 

    findByUserId: async (userId) => {
        const result = await pool.query(
            `SELECT q.*, fp.bank_name, fp.loan_type, fp.loan_amount, fp.status as application_status
       FROM admin_queries q
       JOIN financial_profiles fp ON q.application_id = fp.application_id
       WHERE q.user_id = $1
       ORDER BY q.created_at DESC`,
            [userId]
        );
        return result.rows;
    },

    //3. Find queries for a specific loan application 

    async findByApplicationId(applicationId) {
        const result = await pool.query(`SELECT * FROM admin_queries
     WHERE application_id = $1
     ORDER BY created_at DESC`,
            [applicationId]);

        return result.rows[0];
    },

    //4. Find query by ID
    async findById(queryId) {
        const result = await pool.query("SELECT * FROM admin_queries WHERE id = $1",
            [queryId]);
        return result.rows[0];
    },

    //5. User Resolve query  by providing response note/ attachments

    async resolveQuery(queryId, userResponse) {

        const result = await pool.query(
            `UPDATE admin_queries
            SET
            is_resolved = true,
            user_response = $1,
            resolved_at = CURRENT_TIMESTAMP,
            WHERE id = $2
            RETURNING *`

            [userResponse, queryId]
        );

        return result.rows[0];
    },

    //6. Count how many unresolved queries remain for an application

    async countUnresolved(applicationId) {
        const result = await pool.query(`
        Select COUNT(*) FROM admin_queries 
        WHERE application_id = $1 AND is_resolved = false`
        [applicationId]);
        return parseInt(result.rows[0].count || 0);
    },

    //7. Update query status manually set as resolved by admin

    async setAdminResolved(queryId, notes) {
        const result = await pool.query(
            `UPDATE admin_queries
         SET is_resolved = true,
            user_response = COALESCE($1, 'Resolved manually by Administrator'),
            resolved_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING *`,
            [notes, queryId]
        );
        return result.rows[0];
    },
};

