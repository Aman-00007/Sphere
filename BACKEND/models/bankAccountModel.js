/**
 * Manages user's linked personal bank accounts 
 * (SBI, HDFC, PNB savings/salary accounts);
 */

import pool from "../db.js";

export const bankAccountModel = {

    //1. Create a new linked bank_account

    async create(data) {
        const {
            user_id,
            bank_name,
            bank_code,
            account_number,
            ifsc,
            account_type = "Savings",
            balance = 50000.00,
            is_primary = false,
        } = data;

        const result = await pool.query(`
            INSERT INTO bank_accounts (
                user_id, bank_name, bank_code, account_number, ifsc, account_type, balance, is_primary)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [
                user_id,
                bank_name,
                bank_code.toUpperCase(),
                account_number,
                ifsc.toUpperCase(),
                account_type,
                parseFloat(balance),
                is_primary,
            ]
        );
        return result.rows[0];
    },

    //2. Find all accounts for a specific user

    async findByUserId(userId) {
        const result = await pool.query(`
            SELECT * FROM linked_bank_accounts WHERE user_id = $1 ORDER BY is_primary DESC, created_at DESC`, [userId]);
        return result.rows;
    },


    // 3. Update account details (e.g. when marking as primary)

    async update(id, data) {
        const result = await pool.query(
            `UPDATE linked_bank_accounts SET 
            bank_name = $2,
            bank_code = $3,
            account_number = $4,
            ifsc = $5,
            account_type = $6,
            balance = $7,
            is_primary = $8
         WHERE id = $1 RETURNING *`,
            [
                id,
                data.bank_name,
                data.bank_code,
                data.account_number,
                data.ifsc,
                data.account_type,
                data.balance,
                data.is_primary,

            ]
        );
        return result.rows[0];
    },

    //4. Delete/Unlink bank account 

    async delete(id, userId) {
        const result = await pool.query(
            "DELETE FROM linked_bank_accounts WHERE id = $1 AND user_id = $2 RETURNING id",
            [id, userId]
        );
        return result.rows[0];
    },

    // 5. Set account as primary

    async setPrimary(id, userId) {
        await pool.query("UPDATE linked_bank_accounts SET is_primary = false WHERE user_id = $1", [userId]);
        const result = await pool.query(
            "UPDATE linked_bank_accounts SET is_primary = true WHERE id = $1 AND user_id = $2 RETURNING *",
            [id, userId]
        );
        return result.rows[0];
    },

};