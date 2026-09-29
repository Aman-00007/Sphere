import express from "express";
import {
    getLinkedAccounts,
    linkBankAccount,
    deleteBankAccount,
    setPrimaryAccount,
} from "../controllers/bankAccountController.js";
import { verifyToken } from "../middleware/authMiddleware.js";


const router = express.Router();

router.use(verifyToken);

// List all linked bank accounts & total liquid balance
router.get("/linked-accounts", getLinkedAccounts);

//Link a new bank account
router.post("/link", linkBankAccount);

// Unlink / remove an account
router.delete("/:id", deleteBankAccount);

//Set an account as primary
router.patch("/:id/primary", setPrimaryAccount)

export default router;