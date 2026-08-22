import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "sphere_jwt_secret_key_2026";

/**
 * VERIFY JWT TOKEN MIDDLEWARE
 * Checks the Authorization header (Bearer <token>) and attaches decoded user payload to req.user
 */
export const verifyToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res
      .status(401)
      .json({ message: "Access denied. No token provided." });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ message: "Invalid or expired token." });
  }
};

/**
 * CHECK ADMIN ROLE MIDDLEWARE
 * Ensures that the user has an admin role before proceeding to protected banker/admin routes.
 */
export const checkAdminRole = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res
      .status(403)
      .json({ message: "Access denied. Administrator privileges required." });
  }
  next();
};
