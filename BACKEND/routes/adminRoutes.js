import express from "express";

import {
    getAdminDashboardMetrics,
    getAlApplications,
    updatedApplicationStatus,
    raiseAdminQuery,
    getNotificationLogs,
    getAllUsers,
} from "../controllers/adminController.js";
import { verifyToken, checkAdminRole } from "../middleware/authMiddleware.js";

const router = express.Router();

//Protect all admin routes with both JWT verification and Admin role check
router.use(verifyToken, checkAdminRole);

// Dashboard overview & KPIs(Key performance Indicators)
router.get("/metrics", getAdminDashboardMetrics);

// Master Loan pipeline management 

router.get("/applications", getAllApplications);
router.patch("/application/:applicationId/status", updatedApplicationStatus);

//Raise queries for missing documents
router.post("/queries", raiseAdminQuery);

//Notification management
router.get("/notifications", getNotificationLogs);

//User Management
router.get("/users", getAllUsers);

export default router;