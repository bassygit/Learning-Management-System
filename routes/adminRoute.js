import express from 'express';
import {
            getAllUsers,
            getSingleUser,
            updateUserRole,
            updateUserStatus,
            deleteUser,
            getAllStudents,
            getStudentDetails,
            getAllInstructors,
            getInstructorDetails,
            verifyInstructor,
            getAllCourses,
            getAdminSingleCourse,
            deleteCourse,
            moderateCourse,
            getAnalytics,
            getCourseAnalytics,
            submitReport,
            getAllReports,
            getSingleReport,
            reviewReport,
            getReportStats
} from '../controllers/adminController.js';
import validate from '../validators/adminValidator.js';
import { updateUserRoleSchema, updateUserStatusSchema, verifyInstructorSchema, moderateCourseSchema, submitReportSchema, reviewReportSchema } from '../validators/adminValidator.js';
import authMiddleware, { adminOnly } from '../middlewares/authMiddleware.js';

const adminRoutes = express.Router();


//  ALL ADMIN ROUTES NEED AUTH AND ADMIN ROLE

// USER MANAGEMENT 
adminRoutes.get('/users', authMiddleware, adminOnly, getAllUsers);
adminRoutes.get('/users/:userId', authMiddleware, adminOnly, getSingleUser);
adminRoutes.patch('/users/:userId/role', authMiddleware, adminOnly, validate(updateUserRoleSchema), updateUserRole);
adminRoutes.patch('/users/:userId/status', authMiddleware, adminOnly, validate(updateUserStatusSchema), updateUserStatus);
adminRoutes.delete('/users/:userId', authMiddleware, adminOnly, deleteUser);

// STUDENT MANAGEMENT 
adminRoutes.get('/students', authMiddleware, adminOnly, getAllStudents);
adminRoutes.get('/students/:studentId', authMiddleware, adminOnly, getStudentDetails);

// INSTRUCTOR MANAGEMENT 
adminRoutes.get('/instructors', authMiddleware, adminOnly, getAllInstructors);
adminRoutes.get('/instructors/:instructorId', authMiddleware, adminOnly, getInstructorDetails);
adminRoutes.patch('/instructors/:instructorId/verify', authMiddleware, adminOnly, validate(verifyInstructorSchema), verifyInstructor);

// COURSE MANAGEMENT 
adminRoutes.get('/courses', authMiddleware, adminOnly, getAllCourses);
adminRoutes.get('/courses/:courseId', authMiddleware, adminOnly, getAdminSingleCourse);
adminRoutes.delete('/courses/:courseId', authMiddleware, adminOnly, deleteCourse);
adminRoutes.patch('/courses/:courseId/moderate', authMiddleware, adminOnly, validate(moderateCourseSchema), moderateCourse);

// ANALYTICS AND REPORTING 
adminRoutes.get('/analytics', authMiddleware, adminOnly, getAnalytics);
adminRoutes.get('/analytics/courses', authMiddleware, adminOnly, getCourseAnalytics);


//  CONTENT MODERATION 

// any logged in user can submit a report
adminRoutes.post('/reports', authMiddleware, validate(submitReportSchema), submitReport);

// admin only routes
adminRoutes.get('/reports/stats', authMiddleware, adminOnly, getReportStats);  // ✅ specific first
adminRoutes.get('/reports', authMiddleware, adminOnly, getAllReports);
adminRoutes.get('/reports/:reportId', authMiddleware, adminOnly, getSingleReport);
adminRoutes.patch('/reports/:reportId/review', authMiddleware, adminOnly, validate(reviewReportSchema), reviewReport);

export default adminRoutes;