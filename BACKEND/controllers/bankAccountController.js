import { bankAccountModel } from "../models/bankAccountModel";

/**
 * 1. Get linked bank accounts for current user
 */

export const getLinkedAccounts = async (req, res) => {
    try {
        const accounts = await bankAccountModel.findByUserId(req.user.id);
        const totalBalance = accounts.reduce((acc, curr) => acc + parseFloat(curr.balance), 0);

        res.json({
            count: accounts.length,
            total_liquid_balance: totalBalance,
            accounts,
        });
    } catch (err) {
        res.status(500).json({ message: "Error retrieving accounts : " + err.message });
    }
};

/**
 * 2.Link a new Bank Account 
 */

export const linkBankAccount = async (req, res) => {
    const {
        bank_name,
        bank_code = "SBI",
        account_number,
        ifsc,
        account_type = "Savings",
        balance = 50000.0
    } = req.body;

    try {
        if (!bank_name || !account_number || !ifsc) {
            return res.status(400).json({ message: "Bank name, account number , and IFSC are required." });
        }

        // Mask account number for security XXXX-XXXX-4567

        const cleanNum = account_number.toString().trim();
        const maskNumber = cleanNum.length >= 4 ? `XXXX-XXXX- ${cleanNum.slice(-4)}` : `XXXX-XXXX-${cleanNum}`;

        const existingAccount = await bankAccountModel.findByUserId(req.user.id);
        const isPrimary = existingAccount.length === 0;

        const account = await bankAccountModel.create({
            user_id: req.user.id,
            bank_name,
            bank_code,
            account_number: maskedNumber,
            ifsc,
            account_type,
            balance,
            is_primary: isPrimary,

        });

        res.staus(201).json({ message: `${bank_name} account linked succesfully!`, account });
    } catch (err) {
        console.error("Error linking bank account:" + err.message);
        res.status(500).json({ message: "Failed to link bank account" + err.message });

    }
};

/**
 * 3. Delete / Unlink Account
 */

export const deleteBankAccount = async (req, res) => {
    try {
        const deleted = await bankAccountModel.delete(req.params.id, req.user.id);
        if (!deleted) return res.status(404).json({ message: "Account not found." });
        res.json({ message: "Account unlinked successfully." });
    } catch (err) {
        res.status(500).json({ message: "Error unlinking account: " + err.message });
    }
};

/**
 * 4. Set Account as Primary
 */
export const setPrimaryAccount = async (req, res) => {
    try {
        const account = await bankAccountModel.setPrimary(req.params.id, req.user.id);
        if (!account) return res.status(404).json({ message: "Account not found." });
        res.json({ message: "Primary account updated.", account });
    } catch (err) {
        res.status(500).json({ message: "Error setting primary account: " + err.message });
    }
};


