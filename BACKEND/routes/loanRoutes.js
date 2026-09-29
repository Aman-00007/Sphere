import express from "express";

import {
    applyForLoan,
    getUserApplication,
    getApplicationById,
    getOngoingLoans,
    payEmi,
    calculatePayoffAccelerator
} from "../controllers/loanControllers.js"

import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// All loan routes require authentication
router.use(verifyToken);

// User application endpoints
router.post("/apply", applyForLoan);
router.get("/my-applications", getUserApplication);
router.get("/application/:applicationId", getApplicationById);

// Ongoing portfolio and repayment endpoints
router.get("/ongoing", getOngoingLoans);
router.post("/pay-emi", payEmi);
router.post("/payoff-accelerator", calculatePayoffAccelerator);


export default router;