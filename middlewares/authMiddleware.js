import jwt from 'jsonwebtoken';
import User from '../models/userModel.js';

// Middleware 1 — checks if user is logged in
export const authMiddleware = async (req, res, next) => {
            try {
                        // get authorization header
                        const authHeader = req.headers.authorization || req.headers.Authorization;

                        // check if token exists
                        if (!authHeader || !authHeader.startsWith("Bearer ")) {
                                    return res.status(401).json({
                                                success: false,
                                                message: "No token provided"
                                    });
                        }

                        // extract token
                        const token = authHeader.split(" ")[1];

                        // verify token
                        const decoded = jwt.verify(token, process.env.JWT_SECRET);

                        // find user
                        const user = await User.findById(decoded.id).select("-password");

                        // check if user exists
                        if (!user) {
                                    return res.status(401).json({
                                                success: false,
                                                message: "User no longer exists"
                                    });
                        }

                        // check if user is active
                        if (!user.isActive) {
                                    return res.status(401).json({
                                                success: false,
                                                message: "Your account has been deactivated. Contact support"
                                    });
                        }

                        // attach user to request
                        req.user = user;
                        next();

            } catch (error) {
                        next(error);
            }
};

// Middleware 2 — checks if user is a student
export const studentOnly = (req, res, next) => {
            if (req.user && req.user.role === 'student') {
                        next();
            } else {
                        return res.status(403).json({
                                    success: false,
                                    message: "Access denied, students only"
                        });
            }
};

// Middleware 3 — checks if user is an instructor
export const instructorOnly = (req, res, next) => {
            if (req.user && req.user.role === 'instructor') {
                        next();
            } else {
                        return res.status(403).json({
                                    success: false,
                                    message: "Access denied, instructors only"
                        });
            }
};

// Middleware 4 — checks if user is an admin
export const adminOnly = (req, res, next) => {
            if (req.user && req.user.role === 'admin') {
                        next();
            } else {
                        return res.status(403).json({
                                    success: false,
                                    message: "Access denied, admins only"
                        });
            }
};

// Middleware 5 — checks if user is an instructor or admin
// useful for routes both can access
export const instructorOrAdmin = (req, res, next) => {
            if (req.user && (req.user.role === 'instructor' || req.user.role === 'admin')) {
                        next();
            } else {
                        return res.status(403).json({
                                    success: false,
                                    message: "Access denied, instructors and admins only"
                        });
            }
};

export default authMiddleware;