import { fetchBankStatements } from './fiData.service.js';
import pool from '../../db.js';

/**
 * Step 3: The Webhook Listener
 * This function waits for Setu to "ping" our server with updates.
 */

export const handleSetuWebhook = async (webhookPayload) => {
    try {
        const { type, data } = webhookPayload;
        if (type === 'CONSENT_STATUS_UPDATE') {
            const consentId = data.consentId;
            const status = data.status;
            console.log(`🔔 Webhook received! Consent [${consentId}] is now: ${status}`);
            if (status === 'ACTIVE') {

                console.log("✅ The user clicked APPROVE! Downloading bank statements...");

                // 1. Actually trigger Step 4 to download the data!
                const bankData = await fetchBankStatements(consentId);

                console.log("✅ Bank data downloaded successfully! Saving to database...");

                // 2. Permanently save their bank balance to their account in PostgreSQL
                await pool.query(
                    `UPDATE linked_bank_accounts 
                    SET balance = $1, 
                    account_type = $2, 
                    is_verified = true 
                    WHERE consent_id = $3`,
                    [bankData.current_balance, bankData.account_type, consentId]
                );

                console.log("💾 Bank data permanently saved to database!");
            } else if (status === 'REJECTED') {

                console.log("❌ The user clicked REJECT. We cannot process their loan.");

                // 3. Update our PostgreSQL database to pause the loan application
                await pool.query(
                    `UPDATE financial_profiles 
                    SET status = 'missing_info' 
                    WHERE consent_id = $1`,
                    [consentId]
                );

            }
        }

        return { success: true };
    } catch (error) {
        console.error("Webhook processing error:", error.message);
        throw new Error("Failed to process webhook");
    }
};