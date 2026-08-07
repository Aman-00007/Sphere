import express from "express";
import { registerUser, loginUser,getMe } from "../controllers/authController.js";
import {verifyToken} from "../middleware/authMiddleware.js";

const router = express.Router();

//Public routes
router.post("/register", registerUser);
router.post("/login", loginUser);

// Protected route to get the current authenticated user's profile
router.get('/me', verifyToken, getMe);

export default router;
