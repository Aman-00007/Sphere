import express from 'express';
import { createConsentRequest } from '../services/setu_aa/consent.service.js';
import { handleSetuWebhook } from '../services/setu_aa/webhook.service.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * 1. Generate Consent Link
 * Our React Frontend will call this when user clicks 'Verify Bank Account'
 */

router.post('generate=link', async (req, res) => {
    try {
        // In a real app, you get this from our auth token (e.g., req.user.phone_number)
        // We are using req.body so you can easily test it in Postman

        const userPhone = req.body.phone_number || "9876543210";

        // Call our Service
        const setuData = await createConsentRequest(userPhone);

        // Send the redirect URL back to React

        res.json(200).json({
            message: "Consent Link generated successfully",
            consentId: setuData.consentId,
            approval_url: setuData.url
        });

    } catch (error) {
        console.error("Route Error:", error);
        res.status(500).json({ message: "Failed to generate Setu link" });

    }
});


/**
 * 2. Setu Webhook Listener
 * Setu's servers will secretly call this URL when the user approves/rejects.
 * 
 */
router.post('/webhook', async (req, res) => {
    try {
        // Pass the incoming data straight to the webhook service we wrote
        await handleSetuWebhook(req.body);

        // Always return 200 OK so Setu knows we received it
        res.status(200).json({ status: "success" });
    } catch (error) {
        console.error("Webhook Route Error:", error);
        res.status(500).json({ message: "Failed to process webhook" });
    }
});

export default router;