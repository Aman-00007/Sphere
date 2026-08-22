// Handles registration, login, OTP verification, user profiles, and KYC management
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { userModel } from "../models/userModel.js";
import pool from "../db.js";
import dotenv from "dotenv";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "sphere_jwt_secret_key_2026";

// In-memory OTP store (stores otp & expiry timestamp per email)
const otpStore = new Map();

/**
 * 1. Register User
 * Validates input, hashes password, calls userModel.create(), and generates OTP
 */
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

    const cleanEmail = email.toLowerCase().trim();
    const cleanPhone = phone_number.trim();

    // 1. Check if user already exists using Model
    const existingUser = await userModel.findByEmail(cleanEmail);
    if (existingUser) {
      return res.status(400).json({ message: "An account with this email already exists." });
    }

    const existingPhone = await userModel.findByPhone(cleanPhone);
    if (existingPhone) {
      return res.status(400).json({ message: "An account with this phone number already exists." });
    }

    // 2. Hash password securely
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // 3. Create user in database using Model
    const createdUser = await userModel.create({
      first_name,
      last_name,
      email: cleanEmail,
      phone_number: cleanPhone,
      password_hash,
      role,
      account_type,
      monthly_income,
      employment_type,
      pan_number,
    });

    // 4. Generate 6-digit Verification OTP (e.g. 749201)
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(cleanEmail, {
      otp: generatedOtp,
      expiresAt: Date.now() + 10 * 60 * 1000, // Valid for 10 minutes
    });

    // Log the OTP dispatch in notifications table (Simulated SMS)
    await pool.query(
      `INSERT INTO notifications (user_id, type, recipient, title, message)
       VALUES ($1, 'sms', $2, 'Verification OTP', $3)`,
      [
        createdUser.id,
        cleanPhone,
        `Your Sphere Banking verification OTP is ${generatedOtp}. Valid for 10 minutes. Do not share this OTP with anyone.`,
      ]
    );

    // 5. Sign JWT token
    const token = jwt.sign(
      { id: createdUser.id, role: createdUser.role, email: createdUser.email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      message: `User registered successfully! A 6-digit verification OTP has been sent to ${cleanPhone}.`,
      token,
      user: createdUser,
      demo_otp: generatedOtp, // Provided for easy development & sandbox testing
    });
  } catch (err) {
    console.error("Registration error:", err.message);
    res.status(500).json({ message: "Server error during registration: " + err.message });
  }
};

/**
 * 2. Verify OTP
 * Upgrades is_verified from false to true via userModel.setVerified()
 */
export const verifyOtp = async (req, res) => {
  const { email, otp } = req.body;

  try {
    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required." });
    }

    const cleanEmail = email.toLowerCase().trim();
    const storedData = otpStore.get(cleanEmail);

    // Verify OTP against store (or master sandbox test OTP '123456')
    if (!storedData || Date.now() > storedData.expiresAt) {
      if (otp !== "123456") {
        return res.status(400).json({ message: "OTP has expired or is invalid. Please request a new one." });
      }
    } else if (storedData.otp !== otp.toString().trim() && otp !== "123456") {
      return res.status(400).json({ message: "Incorrect OTP. Please check and try again." });
    }

    // Mark user as verified using Model
    const updatedUser = await userModel.setVerified(cleanEmail);

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found." });
    }

    // Clear used OTP
    otpStore.delete(cleanEmail);

    res.json({
      message: "Phone number verified successfully! Your account is now active.",
      user: updatedUser,
    });
  } catch (err) {
    console.error("OTP verification error:", err.message);
    res.status(500).json({ message: "Server error during OTP verification: " + err.message });
  }
};

/**
 * 3. Resend OTP
 */
export const resendOtp = async (req, res) => {
  const { email } = req.body;

  try {
    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await userModel.findByEmail(cleanEmail);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(cleanEmail, {
      otp: newOtp,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });

    await pool.query(
      `INSERT INTO notifications (user_id, type, recipient, title, message)
       VALUES ($1, 'sms', $2, 'Resent Verification OTP', $3)`,
      [
        user.id,
        user.phone_number,
        `Your new Sphere verification OTP is ${newOtp}. Valid for 10 minutes.`,
      ]
    );

    res.json({
      message: `New verification OTP dispatched to ${user.phone_number}!`,
      demo_otp: newOtp,
    });
  } catch (err) {
    res.status(500).json({ message: "Error resending OTP: " + err.message });
  }
};

/**
 * 4. Login User or Admin
 * Finds user via userModel.findByEmail(), checks password with bcrypt, and signs JWT
 */
export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const user = await userModel.findByEmail(email);

    if (!user) {
      return res.status(400).json({ message: "Invalid email or password." });
    }

    // Verify password with bcrypt
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password." });
    }

    // Sign JWT token
    const token = jwt.sign(
      { id: user.id, role: user.role, email: user.email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

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
    res.status(500).json({ message: "Server error during login: " + err.message });
  }
};

/**
 * 5. Get Current Authenticated User Profile
 */
export const getMe = async (req, res) => {
  try {
    const user = await userModel.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    res.json({ user });
  } catch (err) {
    console.error("Get profile error:", err.message);
    res.status(500).json({ message: "Server error while fetching profile: " + err.message });
  }
};

/**
 * 6. Update Profile
 */
export const updateProfile = async (req, res) => {
  try {
    const updatedUser = await userModel.updateProfile(req.user.id, req.body);
    res.json({ message: "Profile updated successfully!", user: updatedUser });
  } catch (err) {
    console.error("Update profile error:", err.message);
    res.status(500).json({ message: "Error updating profile: " + err.message });
  }
};

/**
 * 7. Update KYC Status
 */
export const updateKyc = async (req, res) => {
  const { kyc_status = "verified" } = req.body;
  try {
    const updated = await userModel.updateKycStatus(req.user.id, kyc_status);
    res.json({ message: `KYC status updated to ${kyc_status}`, kyc_status: updated.kyc_status });
  } catch (err) {
    res.status(500).json({ message: "KYC update failed: " + err.message });
  }
};
