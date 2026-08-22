
/**
 * Handles bank discovery, filtered queries, 
 * and the Smart Recommendation Engine;
 */

import { bankProductModel } from "../models/bankProductModel.js";




//  6. Admin: Delete a bank product

export const deleteBankProduct = async (req, res) => {
    const { id } = req.params;

    try {
        const deleted = await bankProductModel.delete(id);

        if (!deleted) {
            return res.status(404).json({ message: "Bank product not found." });
        }

        res.json({ message: "Bank product deleted successfully!" });
    } catch (err) {
        console.error("Error deleting bank product:", err.message);
        res.status(500).json({ message: "Server error deleting bank product: " + err.message });
    }
};