import axios from "axios";
import dotenv from "dotenv";

dotenv.config();


const SETU_AA_BASE_URL = "https://fiu-uat.setu.co/v2";
const SETU_CLIENT_ID = process.env.SETU_CLIENT_ID || 'sandbox_client_id';
const SETU_CLIENT_SECRET = process.env.SETU_CLIENT_SECRET || 'sandbox_client_secret';

/**
 * Prove who we are and get a temporary Token from Setu
 */

export const getSetuAAToken = async () => {
    try {
        // 1. Combine our ID and Secret securely
        const credentials = Buffer.from(`${SETU_CLIENT_ID}:${SETU_CLIENT_SECRET}`).toString("base64");

        console.log("🔒 Requesting Setu Account Aggregator Token...");

        // 2. SIMULATION MODE: If we haven't put real keys in our .env file yet,
        // we pretend it succeeded. This prevents your app from crashing while you build it!
        if (SETU_CLIENT_ID === 'sandbox_client_id') {
            console.log("⚠️ Using simulation Setu Token (Real Keys Not Set)");
            return "simulated_setu_bearer_token_12345";
        }

        // 3. The Real API CALL to Setu
        const response = await axios.post(`${SETU_AA_BASE_URL}/sessions`, {}, {
            headers: {
                "Authorization": `Basic ${credentials}`,
                "Content-Type": "application/json",
            }
        });

        // 4. Return the Token so other files can use it
        return response.data.token;
    } catch (err) {
        console.error("Setu Auth Error: ", err.response?.data || err.message);
        throw new Error("Failed to authenticate with Setu AA");
    }
};
