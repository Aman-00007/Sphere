
import pool from "./db.js";
(async () => {
  try {
    const res = await pool.query(`
            INSERT INTO users (
                first_name, last_name, email, phone_number, password_hash,
                role, account_type, monthly_income, employment_type, pan_number, is_verified, kyc_status
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, false, 'pending')
            RETURNING id
        `, ["T", "T", "test1@test.com", "1111", "hash", "user", "standard", 1000, "Salaried", "ABC"]);
    console.log("Success:", res.rows[0]);
  } catch (err) {
    console.error("Error:", err.message);
  }
  process.exit();
})();

