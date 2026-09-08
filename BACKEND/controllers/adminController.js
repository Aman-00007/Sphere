import pool from "../db.js";
import { loanModel } from "../models/loanModel.js";
import { queryModel } from "../models/queryModel.js";
import { notificationModel } from "../models/notificationModel.js";


/**
 * 1. Admin Master Dashboard Metrics
 */

export const getAdminDashboardMetrics = async (req, res) => {
    try {
        const totalAppsRes = await pool.query("SELECT COUNT(*) FROM financial_profiles");
        const approvedRes = await pool.query(
            "SELECT COUNT(*), COALESCE(SUM(loan_amount), 0) as total_disbursed FROM financial_profiles WHERE status = 'approved'"
        );
        const pendingRes = await pool.query("SELECT COUNT(*) FROM financial_profiles WHERE status IN ('pending', 'under_review')");
        const missingInfoRes = await pool.query("SELECT COUNT(*) FROM financial_profiles WHERE status = 'missing_info'");
        const totalUsersRes = await pool.query("SELECT COUNT(*) FROM users WHERE role = 'user'");
        const activeQueriesRes = await pool.query("SELECT COUNT(*) FROM admin_queries WHERE is_resolved = false");

        // Bank distribution breakdown

        const bankDistRes = await pool.query(`
      SELECT bank_name, COUNT(*) as application_count, COALESCE(SUM(loan_amount), 0) as total_volume
      FROM financial_profiles
      GROUP BY bank_name
      ORDER BY application_count DESC
    `);

        const totalApplications = parseInt(totalAppsRes.rows[0].count) || 0;
        const approvedCount = parseInt(approvedRes.rows[0].count) || 0;
        const approvalRate = totalApplications > 0 ? Math.round((approvedCount / totalApplications) * 100) : 0;

        res.json({
            metrics: {
                total_applications: totalApplications,
                total_disbursed_volume: parseFloat(approvedRes.rows[0].total_disbursed),
                pending_reviews: parseInt(pendingRes.rows[0].count) || 0,
                missing_info_count: parseInt(missingInfoRes.rows[0].count) || 0,
                active_queries: parseInt(activeQueriesRes.rows[0].count) || 0,
                total_users: parseInt(totalUsersRes.rows[0].count) || 0,
                approval_rate_pct: approvalRate,
            },
            bank_distribution: bankDistRes.rows,
        });
    } catch (err) {
        res.status(500).json({ message: "Error retrieving admin metrics: " + err.message });
    }
};

/**
 * 2. Get all alpplication with search & filtereing
 */

export const getAllApplications = async (req, res) => {

    try {
        const applications = await loanModel.findAll(req.query);
        res.json({ count: applications.length, applications });
    } catch (err) {
        res.status(500).json({ message: "Error retreving applications" + err.message });
    }
};

/**
 * 3. Update Application Status (Approved , Reject , Under Review, Missing Info)
 */

export const updatedApplicationStatus = async (req, res) => {
    const { applicationId } = req.params;
    const { status, adminRemark } = req.body;

    try {
        const app = await loanModel.findByApplicationId(applicationId);

        if (!app) return res.status(404).json({ message: "Appilcation not found" });

        let ongoingStats = app.ongoing_stats || {};

        if (status === "approved") {
            const nextDate = new Date();
            nextDate.setMonth(nextDate.getMonth() + 1);
            nextDate.setDate(5);

            ongoingStats = {
                total_loan_amount: parseFloat(app.loan_amount),
                tenure_months: parseInt(app.tenure_months),
                paid_emis: 0,
                remaining_emis: parseInt(app.tenure_months),
                next_emi_date: nextDate.toISOString().split("T")[0],
                monthly_emi: parseFloat(app.emi_amount),
                total_paid: 0,
                principal_paid: 0,
                interest_paid: 0,
                principal_remaining: parseFloat(app.loan_amount),
                payment_history: [],
            };
        }
        const updatedApp = await loanModel.updateStatus(applicationId, status, ongoingStats);

        //Dispatch notification to user

        let alertMsg = "";
        if (status === "approved") {
            alertMsg = `Congratulations ${app.first_name}!
            Your ${app.loan_type} application (${applicationId}) with ${app.bank_name} for ₹${parseFloat(app.loan_amount).toLocaleString("en-IN")} has been APPROVED.`;
        } else if (status === "rejected") {
            alertMsg = `Dear ${app.first_name}, your ${app.loan_type} 
            application (${applicationId}) could not be approved at this time. Reason: ${adminRemark || "Eligibility criteria not met"}.`;
        } else if (status === "missing_info") {
            alertMsg = `Action Required: Incomplete documents for application ${applicationId}. 
            Please log in to your dashboard to resolve the query.`;
        }

        if (alertMsg) {
            await notificationModel.create({
                user_id: app.user_id,
                application_id: applicationId,
                type: "sms",
                recipient: app.phone_number,
                title: `Loan Update: ${status.toUpperCase()}`,
                message: alertMsg,
            });
        }
        res.json({ message: `Application status updated to ${status}.`, application: updatedApp });
    } catch (err) {
        res.status(500).json({ message: "Error updating status: " + err.message });
    }
};

/**
 * 4. Raise Admin Query for Missing Info / Documents
 */
export const raiseAdminQuery = async (req, res) => {
    const { applicationId, queryTitle, queryDetails, missingItems = [] } = req.body;
    try {
        const app = await loanModel.findByApplicationId(applicationId);
        if (!app) return res.status(404).json({ message: "Application not found." });
        const query = await queryModel.create({
            application_id: applicationId,
            user_id: app.user_id,
            admin_id: req.user.id,
            query_title: queryTitle,
            query_details: queryDetails,
            missing_items: missingItems,
        });
        // Move application status to 'missing_info'
        await loanModel.updateStatus(applicationId, "missing_info");
        const itemsText = missingItems.length > 0 ? ` (Missing: ${missingItems.join(", ")})` : "";
        const alertMsg = `Urgent: Banker query on application ${applicationId}: "${queryTitle}" - ${queryDetails}${itemsText}. Please upload requested documents on your dashboard.`;
        await notificationModel.create({
            user_id: app.user_id,
            application_id: applicationId,
            type: "sms",
            recipient: app.phone_number,
            title: "Query Raised on Loan Application",
            message: alertMsg,
        });
        res.status(201).json({ message: "Query raised and notification dispatched via SMS!", query });
    } catch (err) {
        res.status(500).json({ message: "Error raising query: " + err.message });
    }
};
/**
 * 5. Get Notification Logs
 */
export const getNotificationLogs = async (req, res) => {
    try {
        const notifications = await notificationModel.findAllLogs();
        res.json({ count: notifications.length, notifications });
    } catch (err) {
        res.status(500).json({ message: "Error fetching notifications: " + err.message });
    }
};
/**
 * 6. Get All Users
 */
export const getAllUsers = async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT u.id, u.first_name, u.last_name, u.email, u.phone_number, u.role, u.account_type, u.credit_score, u.monthly_income, u.employment_type, u.pan_number, u.is_verified, u.kyc_status, u.created_at,
             COUNT(DISTINCT fp.id) as applications_count,
             COUNT(DISTINCT lba.id) as linked_accounts_count
      FROM users u
      LEFT JOIN financial_profiles fp ON u.id = fp.user_id
      LEFT JOIN linked_bank_accounts lba ON u.id = lba.user_id
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `);
        res.json({ users: result.rows });
    } catch (err) {
        res.status(500).json({ message: "Error fetching users: " + err.message });
    }
};




