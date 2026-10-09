/**
 * Handles Direct Loan Applications, auto-generating unique Application IDs 
 * eg :- (APP-2026-XXXXX), EMI payments, and Payoff Acceleration Simulator:
 */
import pool from "../db.js";
import { loanModel } from "../models/loanModel.js";
import { notificationModel } from "../models/notificationModel.js";


// Helper :  Calculte monthly reduciung balance EMI

export const calculateEmi = (principal, annualRate, tenureMonths) => {
    const monthlyRate = annualRate / 12 / 100;
    if (monthlyRate === 0) return (principal / tenureMonths);
    const emi =
        (principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) /
        (Math.pow(1 + monthlyRate, tenureMonths) - 1);
    return Math.round(emi);

};

/**
 *  1 . Direct Loan Application Submission
 * Auto generates application id (eg APP-2026-00123);
 */
export const applyForLoan = async (req, res) => {
    const {
        bank_id,
        bank_name,
        loan_type,
        loan_amount,
        tenure_months = 36,
        interest_rate,
        purpose = "Personal Expenditure",
        employment_status = "Salaried",
        annual_income = 1000000,
        existing_emi = 0,
    } = req.body;

    try {
        if (!bank_name || !loan_type || !loan_amount || !interest_rate) {
            return res.status(400).json({ message: "Bank name, loan type, amount and interest rate are required." });
        }

        // 1. Fetch user's credit score from database

        const userRes = await pool.query(
            "SELECT credit_score, monthly_income , is_verified FROM users WHERE id = $1",
            [req.user.id]
        );

        if (userRes.rows.length === 0) {
            return res.status(404).json({ message: "User not found." });

        }

        const user = userRes.rows[0];

        // Ensures user has verified Otp

        if (!user.is_verified) {
            return res.status(403).json({ message: "Please verify your phone number via OTP before applying for loans." });
        }

        const amount = parseFloat(loan_amount);
        const rate = parseFloat(interest_rate);
        const tenure = parseInt(tenure_months);
        const emi = calculateEmi(amount, rate, tenure);

        // Auto generated UNIQUE ID for application No : (APP-YYYY-XXXXX)
        const currentYear = new Date().getFullYear();
        const randomDigits = Math.floor(10000 + Math.random() * 90000);
        const applicationId = `APP-${currentYear}-${randomDigits}`;


        // Initialize ongoing stats with applicant's credit score standing

        const initialStats = {
            total_loan_amount: amount,
            tenure_months: tenure,
            paid_emis: 0,
            remaining_emis: tenure,
            next_emi_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
            monthly_emi: emi,
            total_paid: 0,
            pricipal_paid: 0,
            interest_paid: 0,
            prinicipal_remaining: amount,
            apllicant_credit_score: user.credit_score,
            cibil_impact: "+10 Points upon regular timely payments",
            payment_history: [],
        };

        // Save Appliaction using loanModel,

        const application = await loanModel.create({
            application_id: applicationId,
            user_id: req.user.id,
            bank_id: bank_id || null,
            bank_name: bank_name.trim(),
            loan_type,
            loan_amount: amount,
            tenure_months: tenure,
            interest_rate: rate,
            emi_amount: emi,
            purpose,
            employment_status,
            annual_income: parseFloat(annual_income),
            existing_emi: parseFloat(existing_emi),
            ongoing_stats: initialStats,

        });

        // log simulated SMS notifiaction to registered phone /email

        await notificationModel.create({
            user_id: req.user.id,
            application_id: applicationId,
            type: "sms",
            recipient: req.user.email,
            tiltle: "Loan Application Submitted",
            message: `Your ${loan_type} Application for ₹${amount.toLocaleString("en-IN")}
            with ${bank_name} has been received under ID: ${applicationId}. Credit Score: ${user.credit_score}. 
            Track status on your dashboard.`,

        });

        res.status(201).json({
            message: "Loan application submitted succesfully!",
            application_id: applicationId,
            application,
        });

    } catch (err) {
        console.error("Error applying for loan:", err.message);
        res.status(500).json({ message: "Error submitting loan application:" + err.message });
    }

};


/**
 * 2. Get all application for the loogged-in user
 */

export const getUserApplication = async (req, res) => {
    try {
        const applications = await loanModel.findByUserId(req.user.id);
        res.json({ count: applications.lenght, applications });
    } catch (err) {
        console.error("Error fetching applications:", err.message);
        res.status(500).json({ message: "Error fetching applications:" + err.message });
    }
};

/**
 * 3. Get application detail by Application ID (Includes credit score & financial profile)
 */

export const getApplicationById = async (req, res) => {
    const { applicationId } = req.params;
    try {
        const application = await loanModel.findByApplicationId(applicationId);
        if (!application) {
            return res.status(404).json({ message: "Application not found" });
        }
        if (req.user.role !== "admin" && application.user.id !== req.user.id) {
            return res.status(403).json({ message: "Unauthorized acess." });
        }

        res.json({ application })
    } catch (err) {
        console.error("Error retrieving application")
        res.status(500).json({ message: "Error retrieving application" + err.message });
    }
};
/**
 * 4 . Get Ongoing Loans & Portfolio Repayment Statistics
 */

export const getOngoingLoans = async (req, res) => {
    try {
        const approvedLoans = await loanModel.findApprovedByUserId(req.user.id);

        let totalActiveDebt = 0;
        let totalMonthlyEmi = 0;
        let totalPaidTillDate = 0;

        const formatedLoans = approvedLoans.map((loan) => {
            const stats = loan.ongoing.stats || {};
            const prinicipal_remaining = parseFloat(stats.prinicipal_remaining || loan.loan_amount);
            const monthly_emi = parseFloat(stats.monthly_emi || loan.emi_amount || 0);
            const total_paid = parseFloat(stats.total_paid || 0);

            totalActiveDebt += prinicipal_remaining;
            totalMonthlyEmi += monthly_emi;
            totalPaidTillDate += total_paid;

            return { ...loan, ongoing_stats: stats };
        });


        res.json({
            summary: {
                active_loan_count: formatedLoans.length,
                total_active_debt: totalActiveDebt,
                total_monthly_emi: totalMonthlyEmi,
                total_paid_till_date: totalPaidTillDate,
                debt_to_income_ratio: 28.5,
            },
            ongoing_loans: formatedLoans,
        });
    } catch (err) {
        res.status(500).json({ message: " Error fetching ongoing loans: " + err.message });
    }
};

/**
 *  5. Pay Monthly Emi (Reduces principal balance  + Boosts Credit Score +5 points)
 */
export const payEmi = async (req, res) => {
    const { applicationId, paymentMode = "Auto-Debit NetBanking" } = req.body;
    try {
        const app = await loanModel.findByApplicationId(applicationId);
        if (!app || app.user_id !== req.user.id) {
            return res.status(404).json({ message: "Loan application not found." });
        }
        const stats = app.ongoing_stats || {
            paid_emis: 0,
            remaining_emis: app.tenure_months,
            total_paid: 0,
            principal_paid: 0,
            interest_paid: 0,
            principal_remaining: app.loan_amount,
            payment_history: [],
        };
        const emi = parseFloat(app.emi_amount);
        const monthlyRate = parseFloat(app.interest_rate) / 12 / 100;
        const interestPart = Math.round(parseFloat(stats.principal_remaining) * monthlyRate);
        const principalPart = emi - interestPart;
        const updatedPaidEmis = (parseInt(stats.paid_emis) || 0) + 1;
        const updatedRemainingEmis = Math.max(0, (parseInt(stats.remaining_emis) || app.tenure_months) - 1);
        const updatedTotalPaid = parseFloat(stats.total_paid || 0) + emi;
        const updatedPrincipalPaid = parseFloat(stats.principal_paid || 0) + principalPart;
        const updatedInterestPaid = parseFloat(stats.interest_paid || 0) + interestPart;
        const updatedPrincipalRemaining = Math.max(0, parseFloat(stats.principal_remaining || app.loan_amount) - principalPart);

        const newPaymentEntry = {
            month: new Date().toLocaleString("en-US", { month: "short", year: "numeric" }),
            amount: emi,
            principal_split: principalPart,
            interest_split: interestPart,
            status: "Paid On Time",
            mode: paymentMode,
            timestamp: new Date().toISOString(),
        };

        const nextDate = new Date();
        nextDate.setMonth(nextDate.getMonth() + 1);
        nextDate.setDate(5);
        const updatedStats = {
            ...stats,
            paid_emis: updatedPaidEmis,
            remaining_emis: updatedRemainingEmis,
            next_emi_date: nextDate.toISOString().split("T")[0],
            total_paid: updatedTotalPaid,
            principal_paid: updatedPrincipalPaid,
            interest_paid: updatedInterestPaid,
            principal_remaining: updatedPrincipalRemaining,
            payment_history: [newPaymentEntry, ...(stats.payment_history || [])],
        };

        // 1. Update loan repayment stats

        await loanModel.updateOngoingStats(applicationId, updatedStats);

        // 2. ⭐ DYNAMIC CREDIT SCORE BOOST: Reward on-time payment with 
        // +5 points (max 900)

        await pool.query(
            "UPDATE users SET credit_score = LEAST(900, credit_score + 5) WHERE id = $1",
            [req.user.id]
        );

        // 3. Dispatch SMS notification

        await notificationModel.create({
            user_id: req.user.id,
            application_id: applicationId,
            type: "sms",
            recipient: req.user.email,
            title: "EMI Payment Received",
            message: `₹${emi.toLocaleString("en-IN")} EMI received for ${applicationId}. Remaining balance: ₹${updatedPrincipalRemaining.toLocaleString("en-IN")}. Credit Score increased by +5 points!`,
        });

        res.json({
            message: `EMI of ₹${emi.toLocaleString("en-IN")} paid successfully! Your Credit Score increased by +5 points!`,
            ongoing_stats: updatedStats,
        });
    } catch (err) {
        console.error("Error processing EMI payment:", err.message);
        res.status(500).json({ message: "Error processing EMI payment: " + err.message });
    }
};

/**
 * 6. Payoff Acccelerator Calculator
 */

export const calculatePayoffAccelerator = async (req, res) => {

    const {
        loan_amount,
        interest_rate,
        tenure_months,
        extra_monthly_payment = 0
    } = req.body;

    const principal = parseFloat(loan_amount);
    const rate = parseFloat(interest_rate);
    const months = parseInt(tenure_months);
    const extra = parseFloat(extra_monthly_payment) || 0;

    const baseEmi = calculateEmi(principal, rate, months);
    const totalBasePayment = baseEmi * months;
    const totalBaseInterest = totalBasePayment - principal;

    if (extra <= 0) {
        return res.json({
            base_emi: baseEmi,
            base_total_normal: totalBaseInterest,
            new_tenure_months: months,
            interest_saved: 0,
        });
    }

    let remainingPrincipal = principal;
    const monthlyRate = rate / 12 / 100;
    const newMonthlyPayment = baseEmi + extra;
    let newMonths = 0;
    let acceleratedTotalInterest = 0;

    while (remainingPrincipal > 0 && newMonths < months) {
        newMonths++;
        const interestForMonth = remainingPrincipal * monthlyRate
        acceleratedTotalInterest += interestForMonth;

        const principalPaidThisMonth = newMonthlyPayment - interestForMonth;

        remainingPrincipal -= principalPaidThisMonth;


        if (remainingPrincipal <= 0) break;
    }
    const monthsSaved = Math.max(0, months - newMonths);
    const interestSaved = Math.max(0, Math.round(totalBaseInterest - acceleratedTotalInterest));
    res.json({
        base_emi: baseEmi,
        accelerated_monthly_payment: newMonthlyPayment,
        normal_tenure_months: months,
        new_tenure_months: newMonths,
        months_saved: monthsSaved,
        normal_total_interest: totalBaseInterest,
        accelerated_total_interest: Math.round(acceleratedTotalInterest),
        interest_saved: interestSaved,
    });

};



