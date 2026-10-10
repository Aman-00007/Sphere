import axios from "axios";
import { getSetuAAToken } from "./auth.service.js";

const SETU_AA_BASE_URL = "https://fiu-uat.setu.co/v2";
const SETU_CLIENT_ID = process.env.SETU_CLIENT_ID || 'sandbox_client_id';


/**
 * Create a Consent Request to ask the user for data access
 * @param {string} userPhone - The phone number of the user applying for the loan
 */

export const createConsentRequest = async (userPhone) => {
    try {
        // 1. Get our secure token from auth.service

        const token = await getSetuAAToken();

        console.log(`📝 Generating RBI-compliant consent Link for ${userPhone}`);

        // 2. SIMULATION MODE :
        // If we are using fake sandbox keys, just return a fake approval URL for testing
        if (SETU_CLIENT_ID === 'sandbox_client_id') {
            return {
                consentId: "simulated_consent_999",
                url: `https://sandbox.setu.co/consent/simulated_consent_999`
            };
        }

        // 3. The Real AA payload (Strict RBI Formatting)

        const payload = {
            Detail: {
                consentStart: new Date().toISOString(),
                // The link will expire if the user doesn't click it within 30 days
                consentExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                Customer: { id: `${userPhone}@setu-aa` }, // Setu uses phone@setu-aa to identify sandbox users

                FIDataRange: {
                    from: sixMonthsAgo.toISOString(), // Dynamically asks for exactly 6 months ago!
                    to: new Date().toISOString()      // Up to right now
                },

                purpose: {
                    code: "101",
                    refUri: "https://api.rebit.org.in/aa/purpose/101.xml",
                    text: "Wealth management and loan underwriting", // Legal reason for the request
                    Category: { type: "string" }
                },
                DataLife: { unit: "MONTH", value: 1 }, // How long Sphere will keep this data
                DataConsumer: { type: "FIU", id: SETU_CLIENT_ID }, // FIU = Financial Information User (Us)
            }
        };
        // 4. Send the request to Setu
        const response = await axios.post(`${SETU_AA_BASE_URL}/consents`, payload, {
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        // 5. Return the ID and the URL so our React app can show it to the user
        return {
            consentId: response.data.id,
            url: response.data.url
        };

    } catch (err) {
        console.error("Setu Consent Error:", err.response?.data || err.message);
        throw new Error("Failed to create Setu Consent Request");
    }


};



