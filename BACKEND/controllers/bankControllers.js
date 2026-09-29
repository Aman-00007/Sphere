
/**
 * Handles bank discovery, filtered queries, 
 * and the Smart Recommendation Engine;
 */

import { bankProductModel } from "../models/bankProductModel.js";


//  1. List all bank product with optional filtering 
export const listBankProducts = async (req, res) => {

  try {
    const products = await bankProductModel.findProducts(req.query);
    res.json({ count: products.length, products });

  } catch (err) {
    console.error("Error fetching bank products:", err.message);
    res.status(500).json({ message: "Error fetching bank Products : " + err.message });
  }

};

// 2. Get single bank Product by ID

export const getBankProductById = async (req, res) => {

  try {
    const product = await bankProductModel.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Bank product not found." });

    }
    res.json({ product });

  } catch (err) {
    console.error("Error fetching bank product:", err.message);
    res.status(500).json({ message: "Server error fetching bank product : " + err.message });
  }

};

/**
* 3. Smart Loan Recommendation Algorithm
* Calculates reducing-balance monthly EMI, match score (0-100), and assigns smart badges:
* - 🏆 'Recommended Batch'
* - 📉 'Lowest Interest'
* - ⚡ 'Fastest Disbursal'
* - 🛡️ 'High Approval Odds'
*/

export const getRecommendations = async (req, res) => {

  const {
    loan_type = "Personal Loan",
    loan_amount = 500000,
    tenure_months = 36
  } = req.query;

  const amount = parseFloat(loan_amount) || 500000;
  const tenure = parseInt(tenure_months) || 36;

  try {
    let creditScore = 750;
    let monthlyIncome = 85000;

    // use logged in user's profile if authenticated

    if (req.user) {
      creditScore = req.user.vredit_score || 750;
      monthlyIncome = parseFloat(req.user.monthly_income) || 85000;
    }

    const products = await bankProductModel.findProducts({ loan_type });
    if (products.length == 0) {
      return res.json({ recommendations: [] });
    }

    const lowestRate = Math.min(...products.map((p) => parseFloat(p.interest_rate_min)));

    // Score and badge each bank product 

    const scoreProducts = products.map((p, index) => {
      const minRate = parseFloat(p.interest_rate_min);
      const approvalRate = parseInt(p.approval_rate_pct) || 90;
      const procFee = parseFloat(p.processing_fee_pct);

      // Reducing balance EMI calculation formula :
      // EMI = (P * r * (1+r)^n) / ((1+r)^n - 1)

      const monthlyRate = minRate / 12 / 100;
      const emi = Math.round(
        (amount * monthlyRate * Math.pow(1 + monthlyRate, tenure)) /
        (Math.pow(1 + monthlyRate, tenure) - 1)
      );
      const totalPayable = emi * tenure;
      const totalInterest = totalPayable - amount;


      // Calculate Match Score (0-100)

      let matchScore = 80;
      if (minRate === lowestRate) matchScore += 10;
      if (creditScore >= 750) matchScore += 5;
      if (approvalRate >= 92) matchScore += 5;
      if (procFee <= 0.5) matchScore += 5;

      //Assign Badges  based on criteria:

      // p = product

      const badges = [];

      if (index === 0 || minRate === lowestRate) {
        badges.push({ label: "Lowest Interest", type: "lowest_rate" });
      }
      if (approvalRate >= 93) {
        badges.push({ label: "High Approval Odds", type: "high_approval" });
      }
      if (p.bank_code === "HDFC" || p.bank_code === "SBI") {
        badges.push({ label: "Fast Disbursal", type: "fast_disbursal" });
      }
      if (matchScore >= 95 || (index === 0 && p.is_featured)) {
        badges.unshift({ label: "Recommended Batch", type: "recommended" });
      }
      // Return bank Product with calculated metrics
      return {
        ...p,
        estimated_emi: emi,
        total_payable: totalPayable,
        total_interest: totalInterest,
        match_score: Math.min(matchScore, 99),
        badges: badges.slice(0, 2),
      };
    });

    //Sort highest match first

    scoreedProducts.sort((a, b) => b.matchScore - a.matchScore);

    res.json({
      user_credit_score: creditScore,
      user_monthly_income: monthlyIncome,
      requested_amount: amount,
      requested_tenure_months: tenure,
      recommendations: scoredProducts,
    });

  } catch (err) {
    console.error("Error calculating recommedations : ", err.message);
    res.status(500).json({ message: "Error calculating recommendations." + err.message });
  }

};

// 4. Admin: Create Bank Product

export const createBankProduct = async (req, res) => {
  try {
    const product = await bankProductModel.create(req.body);
    res.status(201).json({ message: "Bank product created successfully!", product });
  } catch (err) {
    res.status(500).json({ message: "Error creating product: " + err.message });
  }
};

// 5. Admin: Update Bank Product

export const updateBankProduct = async (req, res) => {
  try {
    const product = await bankProductModel.update(req.params.id, req.body);
    if (!product) return res.status(404).json({ message: "Bank product not found." });

    res.json({ message: "Bank product updated successfully!", product });
  } catch (err) {
    res.status(500).json({ message: "Error updating product: " + err.message });
  }
};



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