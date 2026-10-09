import { queryModel } from "../models/queryModel.js";
import { loanModel } from "../models/loanModel.js";
import { notificationModel } from "../models/notificationModel.js";


/**
 * 1. Get all queries for a current logged-in-user
 */

export const getQueries = async (req, res) => {
    try {
        const queries = await queryModel.findByUserId(req.user.id);
        const unreadCount = queries.filter((q) => !q.is_resolved).length;

        res.json({
            count: queries.length,
            unread_count: unreadCount,
            queries,
        });
    } catch (err) {
        res.status(500).json({ message: "Error retrieving queries : " + err.message });
    }
};

/**
 * 2. User Resolves Query (Provides response / upload note)
 * If all queries are resolved, automatically moves application back to 'under_review'
 */

export const resolvedQuery = async (req, res) => {
    const { queryId } = req.params;
    const { user_response } = req.body;

    try {
        const query = await queryModel.findById(queryId);
        if (!query) {
            return res.status(404).json({ message: "Query not found." });
        }

        if (query.user_id !== req.user.id) {
            return res.status(403).json({ message: "Unauthorized" })
        }

        const updatedQuery = await queryModel.resolveQuery(queryId, user_response);

        // Check if any other unresolved queries exist for this application
        const unresolvedCount = await queryModel.countUnresolved(query.application_id);
        if (unresolvedCount === 0) {
            await loanModel.updateStatus(query.application_id, "under_review");
        }

        //Log resolution alert 
        await notificationModel.create({
            user_id: query.user_id,
            application_id: query.application_id,
            type: "in_app",
            recipient: "Admin Operations Desk",
            title: "Admin Resolved Query",
            message: `Applicant provided clarifications for Query #${queryId} on 
        Application ${query.application_id}. Application moved back to Under Review.`,
        });
        res.json({
            message: "Query resolved successfully! Application moved back to Under Review.",
            query: updatedQuery,
        });
    } catch (err) {
        res.status(500).json({ message: "Error resolving Query : " + err.message });
    }
};
