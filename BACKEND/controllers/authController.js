// handle registration,login, and fetching the current authenticated user profile

import bycrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../db.js";
import dotenv from "dotenv";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

export const registerUser = async (req, res) => {
  const {
    first_name,
    last_name,
    email,
    phone_number,
    password,
    role,
    account_type,
  } = req.body;

  try {
    // Check if user already exists
    const existingUser = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email],
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: "User already exists." });
    }

    // Hash the password
    const salt = await bycrypt.genSalt(10);
    const password_hash = await bycrypt.hash(password, salt);

    // Insert new user into the database
    const newUser = await pool.query(
      "INSERT INTO users (first_name, last_name, email, phone_number, password_hash, role, account_type) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
      [
        first_name,
        last_name,
        email,
        phone_number,
        password_hash,
        role,
        account_type,
      ],
    );

    const createdUser = newUser.rows;

    //sign a JWT token containing the user's ID ans role

    const token = jwt.sign(
      { id: createdUser.id, role: createdUser.role },
      JWT_SECRET,
      { expiresIn: "1h" },
    );
    res.status(201).json({
      message: "User registered successfully.",
      token,
      user: createdUser,
    });
  } catch (err) {
    console.error("Registration error:", err.message);
    res.status(500).json({ message: "Server error during registration." });
  }
};

/**
 * Login user or admin
 * Authenticate user credentials and return a JWT token if valid.
 */

export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    //Find user by email
    const userResult = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email],
    );

    if (userResult.rows.length === 0) {
      return res.status(400).json({ message: "Invalid email or password." });
    }
    const user = userResult.rows;
    // Verify the password

    const isMatch = await bycrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password." });
    }

    //sign a JWT token containing the user's ID and role
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, {
      expiresIn: "1d",
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
      },
    });
  } catch (err) {
    console.error("Login error:", err.message);
    res.status(500).json({ message: "Server error during login." });
  }
};

/** Get the current authenticated user's profile */

export const getMe = async (req, res) => {
  try {
    const userResult = await pool.query(
      "SELECT id, first_name, last_name, email, phone_number, role, account_type FROM users WHERE id = $1",
      [req.user.id],
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    res.json({ user: userResult.rows });
  } catch (err) {
    console.error("Get profile error:", err.message);
    res
      .status(500)
      .json({ message: "Server error while fetching user profile." });
  }
};
