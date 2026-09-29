import express from "express";
import {
    listBankProducts,
    getBankProductById,
    createBankProduct,
    updateBankProduct,
    deleteBankProduct,
    getRecommendations,
} from "../controllers/bankControllers.js";

import { verifyToken, checkAdminRole } from "../middleware/authMiddleware.js";
const router = express.Router();

// Public routes
router.get("/products", listBankProducts);
router.get("/products/:id", getBankProductById);
router.get("/recommendations", getRecommendations);

// Admin routes (require authentication and admin role)
router.post("/products", verifyToken, checkAdminRole, createBankProduct);
router.put("/products/:id", verifyToken, checkAdminRole, updateBankProduct);
router.delete("/products/:id", verifyToken, checkAdminRole, deleteBankProduct);

export default router;