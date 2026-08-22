import pool from "../db.js";

export const userModel = {
  // Find user by email
  findByEmail: async (email) => {
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [
      email.toLowerCase().trim(),
    ]);
    return result.rows[0];
  },

  // Find user by phone number
  findByPhone: async (phone) => {
    const result = await pool.query("SELECT * FROM users WHERE phone_number = $1", [
      phone.trim(),
    ]);
    return result.rows[0];
  },

  // Find user by ID (excludes password_hash for security)
  findById: async (id) => {
    const result = await pool.query(
      `SELECT id, first_name, last_name, email, phone_number, role, account_type, credit_score, monthly_income, employment_type, pan_number, is_verified, kyc_status, created_at 
       FROM users WHERE id = $1`,
      [id]
    );
    return result.rows[0];
  },

  // Create new user (default is_verified = false, kyc_status = 'pending', credit_score = 750)
  create: async (userData) => {
    const {
      first_name,
      last_name,
      email,
      phone_number,
      password_hash,
      role = "user",
      account_type = "standard",
      monthly_income = 85000,
      employment_type = "Salaried",
      pan_number = "ABCDE1234F",
    } = userData;

    const result = await pool.query(
      `INSERT INTO users (first_name, last_name, email, phone_number, password_hash, role, account_type, credit_score, monthly_income, employment_type, pan_number, is_verified, kyc_status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, 750, $8, $9, $10, false, 'pending') 
       RETURNING id, first_name, last_name, email, phone_number, role, account_type, credit_score, monthly_income, employment_type, pan_number, is_verified, kyc_status, created_at`,
      [
        first_name.trim(),
        last_name.trim(),
        email.toLowerCase().trim(),
        phone_number.trim(),
        password_hash,
        role === "admin" ? "admin" : "user",
        account_type,
        parseFloat(monthly_income) || 85000,
        employment_type,
        pan_number.toUpperCase().trim(),
      ]
    );
    return result.rows[0];
  },

  // Mark user's phone/email as verified via OTP
  setVerified: async (email) => {
    const result = await pool.query(
      `UPDATE users SET is_verified = true WHERE email = $1 RETURNING id, first_name, last_name, email, phone_number, role, is_verified, kyc_status`,
      [email.toLowerCase().trim()]
    );
    return result.rows[0];
  },

  // Update profile attributes (income, phone, employment, PAN)
  updateProfile: async (id, data) => {
    const {
      first_name,
      last_name,
      phone_number,
      monthly_income,
      employment_type,
      pan_number,
      account_type,
    } = data;

    const result = await pool.query(
      `UPDATE users 
       SET first_name = COALESCE($1, first_name),
           last_name = COALESCE($2, last_name),
           phone_number = COALESCE($3, phone_number),
           monthly_income = COALESCE($4, monthly_income),
           employment_type = COALESCE($5, employment_type),
           pan_number = COALESCE($6, pan_number),
           account_type = COALESCE($7, account_type)
       WHERE id = $8
       RETURNING id, first_name, last_name, email, phone_number, role, account_type, credit_score, monthly_income, employment_type, pan_number, is_verified, kyc_status`,
      [
        first_name,
        last_name,
        phone_number,
        monthly_income,
        employment_type,
        pan_number,
        account_type,
        id,
      ]
    );
    return result.rows[0];
  },

  // Update KYC status (Document verification by Banker/Admin)
  updateKycStatus: async (id, status) => {
    const result = await pool.query(
      `UPDATE users SET kyc_status = $1 WHERE id = $2 RETURNING id, kyc_status`,
      [status, id]
    );
    return result.rows[0];
  },
};
