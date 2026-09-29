// handle registration,login, and fetching the current authenticated user profile

import bycrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../db.js";
import dotenv from "dotenv";


dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "sphere_jwt_secret_key_2026";

// Register user (Regular user or Admin)

export const registerUser = async (req, res) => {
  const {
    first_name,
    last_name,
    email,
    phone_number,
    password,
    role = "user",
    account_type = "standard",
    monthly_income = 85000,
    employment_type = "Salaried",
    pan_number = "ABCDE1234F",
  } = req.body;

  try {

    if (!first_name || !last_name || !email || !phone_number || !password) {
      return res.status(400).json({ message: "All required fields must be provided." });
    }
    // Check if user already exists
    const existingUser = await pool.query(
      "SELECT * FROM users WHERE email = $1 OR phone_number = $2",
      [email.toLowerCase().trim(), phone_number.trim()]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: "An account with this email or phone number already exists." });
    }

    // Hash the password
    const salt = await bycrypt.genSalt(10);
    const password_hash = await bycrypt.hash(password, salt);

    // Insert new user into the database
    const newUser = await pool.query(
      `INSERT INTO users (first_name, last_name, email, phone_number, password_hash, role, account_type,monthly_income,employment_type,pan_number , is_verified, kyc_status) VALUES ($1, $2, $3, $4, $5, $6, $7, 750, $8, $9, $10, false, 'pending') RETURNING id, first_name, last_name, email, phone_number, role, account_type, credit_score, monthly_income, employment_type, pan_number, kyc_status, created_at`,
      [
        first_name.trim(),
        last_name.trim,
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

    const createdUser = newUser.rows[0];

    // Generate 6 digit verification Otp

    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(email.toLowerCase().trim(), {
      otp: generatedOtp,
      expiresAt: Date.now() + 10 * 60 * 1000, // Valid for 10 minutes
    });

    //Log the OTP dispatch in notifiactions table (Simulated SMS to registered phone)

    await pool.query(
      `INSERT INTO notifications (user_id, type, recipient,title, message)
        VALUES($1,'sms',$2, 'Verification OTP',$3) `,
      [
        createdUser.id,
        phone_number.trim(),
        `Your Sphere Verification OTP is: ${generatedOtp}. It will expire in 10 minutes.
          Do not share this OTP with anyone.`,
        `OTP Verification`
      ]
    );


    //sign a JWT token 

    const token = jwt.sign(
      {
        id: createdUser.id,
        role: createdUser.role,
        email: createdUser.email
      },
      JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.status(201).json({
      message: `User registered successfully., 
      A 6-digit verification OTP has been sent to ${phone_number.trim()}.`,
      token,
      user: createdUser,
      demo_otp: generatedOtp, // Provided for easy development & sandbox testing
    });
  } catch (err) {
    console.error("Registration error:", err.message);
    res.status(500).json({ message: "Server error during registration." + err.message });
  }
};

// Verify OTP 

export const verifyOtp = async (req, res) => {
  const { email, otp } = req.body;

  try {
    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are." });
    }

    const cleanEmail = email.toLowerCase().trim();
    const storeData = otpStore.get(cleanEmail);

    // Verify OTP against store( or fallback sandbix test OTP '123456' for demo email)


    if (!storeData || Date.now() > storeData.expiresAt) {
      if (otp !== '123456') {
        return res.status(400).json({
          message: "OTP has expired or is invalid.Please request a new one"
        });
      } else if (storeData.otp !== otp.toString().trim() && otp !== "123456") {
        return res.status(400).json({
          message: "Incorrect OTP. Please check and try again."
        });
      }
    }


    //OTP Verified -> Mark user as verified in database

    const updated = await pool.query(
      `UPDATE users
    SET is_verified = true
    WHERE email = $1
    RETURNING id, first_name,last_name, email, phone_number, role , is_verified, 
    kyc_status`,
      [cleanEmail]
    );

    if (updated.rows.length === 0) {
      return res.status(400).json({ message: "User not found" });
    }

    // Clear used OTP
    otpStore.del(cleanEmail);

    res.json({
      message: "Phone number verified succesfully! Your accoount is now active. ",
      user: updated.rows[0],
    });
  } catch (err) {
    console.error("OTP Verification error", err.message);
    res.status(500).json({
      message: "Server error during OTP verification" + err.message
    });
  }
};

/**
 * Resend OTP
 * If the OTP is expired or missing, allow user to request a new OTP
 */

export const resendOtp = async (req, res) => {
  const { email } = req.body;

  const cleanEmail = email.toLowerCase().trim();
  try {
    if (!email) {
      return res.status(400).json({ message: "Email id is required" });
    }
    //check if the user is registered

    const userRes = await pool.query(
      "SELECT id, phone_number FROM users WHERE email = $1",
      [cleanEmail]
    );
    if (userRes.rows.length === 0) {
      return res.status(400).json({ message: "User not found. " });
    }

    const user = userRes.rows[0];

    //Generate New OTP
    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();

    otpStore.set(cleanEmail, {
      otp: newOtp,
      expiresAt: Date.now() + 10 * 60 * 1000, // Valid for 10 minutes
    });


    await pool.query(
      `INSERT INTO notifications
      (user_id, type, recipient, title, message)
      VALUES
      ($1,'sms',$2,'Resent Verification OTP',$3)`,
      [
        user.id,
        user.phone_number,
        `Your Sphere Verification OTP is: ${newOtp}. It will expire in 10 minutes.
         Do not share this OTP with anyone.`,
      ]
    );
    res.json({
      message: `New verification OTP dispatched to ${user.phone_number}!`,
      demo_otp: newOtp, // Provided for easy development & sandbox testing
    });
  } catch (error) {
    console.error("OTP Resend error:", error.message);
    res.status(500).json({ message: "Server error during OTP resend." + error.message });
  }
};


/**
 * Login user or admin
 * Authenticate user credentials and return a JWT token if valid.
 */

export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.staus(400).json({ message: "Email and Password are required" })
    }

    const cleanEmail = email.toLowerCase().trim();

    //Find user by email

    const userResult = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [cleanEmail],
    );

    if (userResult.rows.length === 0) {
      return res.status(400).json({ message: "Invalid email or password." });
    }
    const user = userResult.rows[0];
    // Verify the password

    const isMatch = await bycrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password." });
    }

    //sign a JWT token containing the user's ID and role

    const token = jwt.sign({
      id: user.id, role: user.role, email: user.email
    }, JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({
      message: "Login successful.",
      token,
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        phone_number: user.phone_number,
        role: user.role,
        account_type: user.account_type,
        is_verified: user.is_verified,
        kyc_status: user.kyc_status,
        credit_score: user.credit_score,
        monthly_income: user.monthly_income,
        employment_type: user.employment_type,
        pan_number: user.pan_number,
      },
    });
  } catch (err) {
    console.error("Login error:", err.message);
    res.status(500).json({ message: "Server error during login." + err.message });
  }
};

/** Get the current authenticated user's profile */

export const getMe = async (req, res) => {
  try {
    const userResult = await pool.query(
      `SELECT id, first_name, last_name, email, phone_number,
       role, account_type,credit_score,monthly_income,employment_type,pan_number,
       is_verified,kyc_status,created_at,
       FROM users WHERE id = $1`,
      [req.user.id],
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    res.json({ user: userResult.rows[0] });
  } catch (err) {
    console.error("Get profile error:", err.message);
    res
      .status(500)
      .json({ message: "Server error while fetching user profile." });
  }
};

/**
 * Update Profile
 */
export const updateProfile = async (req, res) => {

  const {
    first_name, lastnam, phone_number, monthly_income, emplymenttype_type,
    pan_number, account_type } = req.body;

  try {
    const updated = await pool.query(`
          UPDATE users
          SET first_name = COALESCE($1, first_name),
              last_name = COALESCE($2, last_name),
              phone_number = COALESCE($3, phone_number),
              monthly_income = COALESCE($4, monthly_income),
              employment_type = COALESCE($5, employment_type),
              pan_number = COALESCE($6, pan_number),
              account_type = COALESCE($7, account_type),
          WHERE id = $8
          RETURNING id, first_name, last_name, email, phone_number,
       role, account_type,credit_score,monthly_income,employment_type,pan_number,
       is_verified,kyc_status`,

      [
        first_name, last_name, phone_number, monthly_income,
        employment_type, pan_number, account_type, req.user.id
      ]);

    res.json({
      message: "Profile updated successfully",
      user: updated.rows[0],
    });
  } catch (err) {
    console.error("Update profile error " + err.message);
    res.status(500).json({
      message: "Server error while updating profile" + err.message,
    });
  }


};

/**
 * Update Kyc Status (Document Verification)
 */

export const updateKyc = async (req, res) => {
  const { kyc_status } = req.body;
  try {
    const result = await pool.query(
      `UPDATE users SET kyc_status =$1 WHERE id = $2
      RETURNING id,kyc_status`,
      [kyc_status, req.user.id]
    );
    res.json({
      message: `KYC status updated to ${kyc_status}`, kyc_status:
        result.rows[0].kyc_status
    });


  } catch (error) {
    res.status(500).json({
      message: "KYC update failed " + error.message,
    });
  }
};

