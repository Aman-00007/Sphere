import axios from 'axios';
import { getSetuAAToken } from './auth.service.js';

const SETU_AA_BASE_URL = 'https://fiu-uat.setu.co/v2';
const SETU_CLIENT_ID = process.env.SETU_CLIENT_ID || 'sandbox_client_id';

/**
 * Fetch the actual Bank Statements!
 * This is triggered by our Webhook when the user clicks 'Approve'.
 * 
 * @param {string} consentId - The ID of the consent the user just approved
 */

export const fetchBankStatements = async (consentId) => {
    try {
        console.log(`🏦 Fetching Bank Data for Consent ID: ${consentId}`);

        // 1. SIMULATION MODE: Return fake bank data for frontend UI testing
        if (SETU_CLIENT_ID === 'sandbox_client_id') {
            console.log("⚠️ Using simulated Bank Data");
            return {
                account_type: "SAVINGS",
                bank: "HDFC Bank",
                current_balance: 145000.50, // This is what saves to your DB in the webhook!
                average_monthly_balance: 110000,
                transactions: [
                    { date: "2026-10-01", type: "CREDIT", amount: 85000, narration: "SALARY - SPHERE TECH" },
                    { date: "2026-10-05", type: "DEBIT", amount: 15000, narration: "RENT TRANSFER" }
                ]
            };
        }

        // --- The Real Process ---
        // 2. Get our secure token
        const token = await getSetuAAToken();

        // Calculate exactly 6 months ago dynamically
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        // 3. Ask Setu to prepare a secure data download session
        const sessionPayload = {
            consentId: consentId,
            DataRange: {
                from: sixMonthsAgo.toISOString(),
                to: new Date().toISOString()
            },
            format: "JSON"
        };

        // Create the Session
        const sessionRes = await axios.post(`${SETU_AA_BASE_URL}/sessions`, sessionPayload, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        const dataSessionId = sessionRes.data.id;

        // 4. Fetch the actual financial data using the session ID!
        const fiDataRes = await axios.get(`${SETU_AA_BASE_URL}/sessions/${dataSessionId}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        // 5. Return the raw bank statements to your webhook file
        return fiDataRes.data;

    } catch (error) {
        console.error("Data Fetch Error:", error.response?.data || error.message);
        throw new Error("Failed to fetch bank statements from Setu");
    }
};