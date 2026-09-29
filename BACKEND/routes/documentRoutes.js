import express from "express";

import {
  uploadMiddleware,
  uploadDocuments,
  getDocumentByApplication,
  deleteDocument,
  verifyDocumentStatus,
} from "../controllers/documentControllers.js"

import { verifyToken, checkAdminRole } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(verifyToken);


// Upload multiple documents for an application (e.g. max 7 files with field name 'documents')
router.post(
  "/upload/:applicationId",
  uploadMiddleware.array("documents", 7),
  uploadDocuments
);

// View document for a  laon application

router.get("/application/:applicationId", getDocumentByApplication);

// Delete an uploaded document

router.delete("/:id", deleteDocument);

// Admin: Verify or flag document ('verified', 'rejected', 'reupload_required')
router.patch("/:id/verify", checkAdminRole, verifyDocumentStatus);

export default router;