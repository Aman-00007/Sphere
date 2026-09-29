import multer from "multer";
import path from "path";
import fs from "fs";
import { documentModel } from "../models/documentModel.js";
import { loanModel } from "../models/loanModel.js";
import { notificationModel } from "../models/notificationModel.js";

// Ensure 'uploads' directory exists 

const uploadDir = path.join(process.cwd(), "uploads");

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

//Multer Disk Storage Configuration

const storage = multer.diskStorage({

    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },

    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        const baseName = path.baseName(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, "-");
        cb(null, `${baseName}- ${uniqueSuffix}${ext}`);

    },
});

// File filter (PDFs and Images)
const fileFilter = (req, file, cb) => {
    const allowed = [
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/jpg",
        "image/webp",
    ];

    if (allowed.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb(new Error("Only PDF and image files(JPG, PNG , WebP) are allowed"), false);
    }
};

export const uploadMiddleware = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit 
    fileFilter,
});

/**
 * 1. Upload Documents for Loan Application
 */

export const uploadDocuments = async (req, res) => {
    const { applicationId } = req.params;
    const { document_type = "General KYC Document" } = req.body;

    try {
        if (!req.file || req.files.length === 0) {
            return res.status(400).json({ message: "No files uploaded" });
        }

        const savedDocs = [];
        for (const file of req.files) {
            const doc = await documentModel.create({
                application_id: applicationId,
                document_type: document_type,
                document_name: file.originalname,
                file_path: `uploads/ ${file.filename}`,
                file_size: file.size,
                mime_type: file.mimetype,
            });
            savedDocs.push(doc);
        }
        res.status(201).json({
            message: `${savedDocs.length} document(s) uploaded successfully!`,
            docs: savedDocs,
        });
    }
    catch (err) {
        console.error("Document upload error: ", err.message);
        res.status(500).json({ message: "Failed to upload documents" + err.message });
    }
};

/**
 * 2. Get all documents for an application
 */

export const getDocumentByApplication = async (req, res) => {
    try {
        const documents = await documentModel.findByApplicationId(req.params.applicationId);
        res.json({ count: documents.length, documents });
    } catch (err) {
        console.error("Error");
        res.status(500).json({ message: "Error fetching Documents " + err.message });
    }
};

/**
 * 3. Delete Document 
 */

export const deleteDocument = async (req, res) => {
    try {
        const { id } = req.params;

        const doc = await documentModel.findById(id);
        if (!doc) {
            return res.status(404).json({ message: "Document Not Found" });
        }

        //Authorization check if user is owner
        if (doc.user_id !== req.user.id && req.user.role !== "admin") {
            return res.status(403).json({ message: "Unauthorized to delete this document" });
        }

        // Remove local file if present 
        const filePath = path.join(process.cwd(), doc.file_url);
        if (fs.existsSync(filePath)) {
            try {
                fs.unlinkSync(filePath); //delete file from disk 
            }
            catch (err) {
                console.error("Error removing local file:", err.message);
            }
        }
        await documentModel.delete(req.params.id);
        res.json({ message: "Document deleted successfully." });
    } catch (err) {
        res.status(500).json({ message: "Error deleting document: " + err.message });
    }
};

/**
 * 4. Admin : Verify or Flag Documents 
 */

export const verifyDocumentStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body; // 'verified' , 'rejected' , 'reupload_required'

    try {
        const updated = await documentModel.updateStatus(id, status);
        if (!updated) return res.status(404).json({ message: "Document not Found." });

        const doc = await documentModel.findById(id);
        const application = await aplicationModel.findById(doc.application_id);

        if (!application) {
            return res.status(404).json({ message: "Application not found." });
        }

        //Auto-advance application status
        if (status == "verified") {
            //Get all documents for this application
            const allDocs = await documentModel.findByApplicationId(doc.application_id);
            //Check if ALL documents are verified
            const allVerified = allDocs.every(d => d.status === "verified");

            if (allVerified) {
                // Automatically move application to 'under_review' (underwriting)
                await loanModel.update(doc.application_id, { status: "under_review" });

                // Send alert to the applicant
                await notificationModel.create({
                    user_id: application.user_id,
                    application_id: doc.application_id,
                    type: "in_app",
                    recipient: application.email,
                    title: "Documents Verified - Underwriting in Progress",
                    message: `All required documents for application ${doc.application_id} have been verified. Your application is now undergoing final underwriting.`,
                });
            }
        } else if (status === "rejected" || status === "reupload_required") {
            // Automatically flag the application as 'missing_info'
            await loanModel.updateStatus(doc.application_id, "missing_info");
            // Send SMS/Email alert asking user to re-upload
            await notificationModel.create({
                user_id: application.user_id,
                application_id: doc.application_id,
                type: "sms",
                recipient: application.phone_number,
                title: "Action Required - Document Re-upload",
                message: `Your document (${doc.document_type}) for loan ${doc.application_id} was rejected or requires re-upload. Please visit your dashboard to upload a clear copy.`,
            });
        }
        res.json({
            message: `Document marked as ${status} successfully.`,
            document: updated,
        });
    } catch (err) {
        console.error("Error in verifying document:", err.message);
        res.status(500).json({ message: "Error verifying document: " + err.message });
    }
};
