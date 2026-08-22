/**
 * Manages simulated SMS, Email, and in-app alert logs;
 */

import pool from "../db.js";

export const notificationModel = {


    //Create and dispatch a notification log

    async create(data) {
        const {
            user_id,
            application_id,
            type,
            recipient,
            title,
            message
        } = data;

        const result = await pool.query(
            `INSERT INTO notifications (
                user_id,
                application_id,
                type,
                recipient,
                title,
                message 
             VALUES ( $1, $2, $3, $4, $5, $6 )
             RETURNING * `,
            [user_id, application_id || null, type, recipient, title, message]
        );
        return result.rows[0];
    },

    //2 . Find notifications  for  specific user 

    async findUserById(userId) {
        const result = await pool.query(`
        SELECT *FROM notifiactions WHERE user_id = $1 ORDER BY sent_at DESC LIMIT 50`,
            [userId]);
        return result.rows;
    },


    // 3. Admin: Find all system notification logs across the entire platform

    async findAllSystemLogs() {
        const result = await pool.query(
            ` SELECT n.* , u.first_name, u.last_name, u.email as user_email 
        FROM notifications n
        LEFT JOIN users u ON n.user_id = u.id 
        ORDER BY n.sent_at DESC LIMIT 100`
        );
        return result.rows;
    },



};
