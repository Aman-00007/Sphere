import pool from "../db.js";

export const bankProductModel = {

    //Find all product with optional filters

    async findProducts(filters = {}) {
        const {
            loan_type,
            bank_code,
            max_rate,
            min_amount
        } = filters;

        let query = "SELECT * FROM bank_products WHERE 1 = 1";
        const params = [];

        if (loan_type && loan_type !== "ALL") {
            params.push(loan_type);
            query += ` AND LOWER(loan_type) = LOWER($${params.length})`;
        }

        if (bank_code && bank_code !== "ALL") {
            params.push(bank_code.toUpperCase());
            query += ` AND bank_code = $${params.length}`;
        }

        if (max_rate) {
            params.push(parseFloat(max_rate));
            query += ` AND interest_rate_max <= $${params.length}`;
        }

        if (min_amount) {
            params.push(parseFloat(min_amount));
            query += ` AND max_amount >= $${params.length}`;
        }

        query += " ORDER BY interest_rate_min ASC, approval_rate_pct DESC";

        const result = await pool.query(query, params);
        return result.rows;

    },

    //Find specific bank product by id

    async findById(id) {
        const result = await pool.query(`SELECT * FROM bank_products WHERE id = $1`, [id]);
        return result.rows[0];
    },

    //Admin: Create new bank product 

    async create(data) {
        const {
            bank_name,
            bank_code,
            loan_type,
            interest_rate_min,
            interest_rate_max,
            min_amount,
            max_amount,
            min_tenure_years,
            max_tenure_years,
            processing_fee_pct,
            approval_rate_pct = 90,
            features = [],
            is_featured = false,
        } = data;

        const result = await pool.query(`
            INSERT INTO bank_products 
            (
                bank_name,
                bank_code,
                loan_type,
                interest_rate_min,
                interest_rate_max,
                min_amount,
                max_amount,
                min_tenure_years,
                max_tenure_years,
                processing_fee_pct,
                approval_rate_pct,
                features,
                is_featured
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING *`,
            [
                bank_name,
                bank_code,
                loan_type,
                interest_rate_min,
                interest_rate_max,
                min_amount,
                max_amount,
                min_tenure_years,
                max_tenure_years,
                processing_fee_pct,
                approval_rate_pct,
                features,
                is_featured
            ]
        );
        return result.rows[0];
    },

    // Admin Update bank product 

    async update(id, data) {
        const {
            bank_name,
            bank_code,
            loan_type,
            interest_rate_min,
            interest_rate_max,
            min_amount,
            max_amount,
            min_tenure_years,
            max_tenure_years,
            processing_fee_pct,
            approval_rate_pct,
            features,
            is_featured

        } = data;

        const resut = await pool.query(`
            UPDATE bank_products SET 
                bank_product = COALESCE($1 , bank_name),
                bank_code = COALESCE($2, bank_code),
                loan_type = COALESCE($3, loan_type),
                interest_rate_min = COALESCE($4, interest_rate_min),
                interest_rate_max = COALESCE($5, interest_rate_max),
                min_amount = COALESCE($6, min_amount),
                max_amount = COALESCE($7, max_amount),
                min_tenure_years = COALESCE($8, min_tenure_years),
                max_tenure_years = COALESCE($9, max_tenure_years),
                processing_fee_pct = COALESCE($10, processing_fee_pct),
                approval_rate_pct = COALESCE($11, approval_rate_pct),
                features = COALESCE($12, features),
                is_featured = COALESCE($13, is_featured)
                WHERE id = $14
                RETURNING *`,
            [
                bank_name,
                bank_code,
                loan_type,
                interest_rate_min,
                interest_rate_max,
                min_amount,
                max_amount,
                min_tenure_years,
                max_tenure_years,
                processing_fee_pct,
                approval_rate_pct,
                features,
                is_featured,
                id
            ]
        );

        return result.rows[0];

    },

    // Admin: Delete bank product
    async delete(id) {
        const result = await pool.query(`DELETE FROM bank_products WHERE id = $1 RETURNING id`, [id]);
        return result.rows[0];
    },

};

