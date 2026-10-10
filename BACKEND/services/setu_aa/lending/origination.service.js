import axios from 'axios';
import dotenv from 'dotenv';
import { application } from 'express';

dotenv.config();

const LENDING_GATEWAY_URL = 'https://lending-sandbox.setu.co/api';

const LENDING_API_KEY = process.env.LENDING_API_KEY || 'sandbox_lending_key';

/**
 * Submit a Loan Application to external banks via the Aggregator
 * @param {Object} applicationData - Contains PAN, Name, Amount, etc.
 */

export const submitLoanToBank = async (applicationData) => {
    try {
        console.log(`🚀 Sending Loan Application to External Bank Gateway...`);

        // 1. SIMULATION MODE: Pretend we sent it to SBI/HDFC/etc banks

        if (LENDING_API_KEY === 'sandbox_lending_key') {
            console.log("⚠️ Using simulated Lending Gateway");

            //Generating a fake "Bank Tracking ID" so our database has something to save

            return {
                success: true,
                status: "PROCESSING_AT_BANK",
                bank_reference_id: "EXT_BANK_" + Math.floor(Math.random() * 100000),
                message: "Application submitted to external bank successfully."
            };
        }

        // 2. The Real API Call (OCEN/ Lending Standard Payload)
        const payload = {
            customer: {
                pan_number: applicationData.pan_number,
                phone: applicationData.phone_number,
                name: applicationData.full_name,
                email: applicationData.email
            },
            loan_details: {
                loan_amount: applicationData.requested_amount,
                tenure_months: applicationData.tenure_months,
                product_code: applicationData.bank_product_code
            }
        };

        // Send the data securely to thr Gateway
        const response = await axios.post(`${LENDING_GATEWAY_URL}/application`, payload, {
            headers: {
                "Authorization": `Bearer ${LENDING_API_KEY}`,
                "Content-Type": "application/json",
            }
        });

        // The Gateway returns a tracking ID from the real bank
        return {
            success: true,
            status: response.data.status,   // e.g., "APPROVED", "REJECTED", "PROCESSING"
            bank_reference_id: response.data.application_id,
            message: "Application submitted securely."
        }

    } catch (error) {
        console.error("Lending Gateway Error:", error.response?.data || error.message);
        throw new Error("Failed to submit loan to external bank");
    }
}