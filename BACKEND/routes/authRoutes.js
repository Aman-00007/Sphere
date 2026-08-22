import express from "express";
import {
  registerUser,
  verifyOtp,
  resendOtp,
  loginUser,
  getMe,
  updateProfile,
  updateKyc,
} from "../controllers/authController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public Authentication & OTP routes
router.post("/register", registerUser);
router.post("/verify-otp", verifyOtp);
router.post("/resend-otp", resendOtp);
router.post("/login", loginUser);

// Protected routes (requires Bearer JWT token header)
router.get("/me", verifyToken, getMe);
router.put("/profile", verifyToken, updateProfile);
router.patch("/kyc", verifyToken, updateKyc);

export default router;
