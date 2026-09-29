import express from "express";
import {
    getQueries,
    resolvedQuery
} from "../controllers/queryControllers.js"

import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(verifyToken);

// Get all queries for the logged-in user
router.get("/my-queries", getQueries); 

// User resolves an admin query by submitting an explanation or response
router.put("/:queryId/resolve", resolvedQuery);

export default router;

