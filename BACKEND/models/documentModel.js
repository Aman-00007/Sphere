/**
 * Manages uploaded files (Aadhaar Card, PAN Card, Salary Slips, ITR-V, Bank Statements)
 *  and verification statuses:
 */

import pool from "../db.js"

export const documentModel = {

    //1. Save uploaded documents metadata

    async create(data) {
        const {
            application_id,
            document_type,
            document_name,
            filr_url,
            fie_size,
            mime_type,
        } = data;

        const result = await pool.quert(`
            INSERT INTO documents ( application_id,
            document_type,
            document_name,
            filr_url,
            fie_size,
            mime_type )  
            VALUES ($1,$2,$3,$4,$5,$6,'pending')
            RETURNING *`,
            [
                application_id,
                document_type,
                document_name,
                filr_url,
                fie_size,
                mime_type,
            ]
        );

        return result.rows[0];
    },


    //2. Find all document for a specific loan application

    async findByApplicationId(applicationId) {
        const result = await pool.query(`
            SELECT * FROM documents
            WHERE application_id = $1
            ORDER BY uploaded_at DESC`,
            [applicationId]
        );
        return result.rows;
    },

    // 3. Find single document by ID

    async findById(id) {
        const result = await pool.query(`SELECT * FROM documents WHERE id = $1`, [id]);
        return result.rows[0];
    },

    // 4. Delete document

    async delete(id) {
        const result = await pool.query("DELETE FROM documents WHERE id = $1 RETURNING *", [id]);
        return result.rows[0];
    },

    // 5. Admin: Update verification status ('verified', 'rejected', 'reupload_required')

    async updateStatus(id, status) {
        const result = await pool.query(
            "UPDATE documents SET status = $1 WHERE id = $2 RETURNING *",
            [status, id]
        );
        return result.rows[0];
    },


};