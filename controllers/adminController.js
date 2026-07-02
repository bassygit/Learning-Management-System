import User from '../models/userModel.js';
import Course from '../models/courseModel.js';
import Lesson from '../models/lessonModel.js';
import Quiz from '../models/quizModel.js';
import Enrollment from '../models/enrollmentModel.js';
import Certificate from '../models/certificateModel.js';
import InstructorProfile from '../models/instructorModel.js';
import Report from '../models/reportModel.js';
import QuizResult from '../models/quizresultModel.js';

// ---- USER MANAGEMENT ----

// GET /api/admin/users
export const getAllUsers = async (req, res, next) => {
            try {
                        // pagination
                        const page = parseInt(req.query.page) || 1;
                        const limit = parseInt(req.query.limit) || 10;
                        const skip = (page - 1) * limit;

                        // filters
                        const filter = {};
                        if (req.query.role) filter.role = req.query.role;
                        if (req.query.isActive !== undefined) {
                                    filter.isActive = req.query.isActive === 'true';
                        }

                        const users = await User.find(filter)
                                    .select('-password')
                                    .skip(skip)
                                    .limit(limit)
                                    .sort({ createdAt: -1 });

                        const total = await User.countDocuments(filter);

                        return res.status(200).json({
                                    success: true,
                                    data: users,
                                    pagination: {
                                                total,
                                                page,
                                                limit,
                                                totalPages: Math.ceil(total / limit)
                                    }
                        });

            } catch (error) {
                        next(error);
            }
};

// GET /api/admin/users/:userId
export const getSingleUser = async (req, res, next) => {
            try {
                        const user = await User.findById(req.params.userId)
                                    .select('-password');

                        if (!user) {
                                    return res.status(404).json({
                                                success: false,
                                                message: "User not found"
                                    });
                        }

                        return res.status(200).json({
                                    success: true,
                                    data: user
                        });

            } catch (error) {
                        next(error);
            }
};

// PATCH /api/admin/users/:userId/role
export const updateUserRole = async (req, res, next) => {
            try {
                        const { role } = req.body;

                        const user = await User.findById(req.params.userId);
                        if (!user) {
                                    return res.status(404).json({
                                                success: false,
                                                message: "User not found"
                                    });
                        }

                        // prevent admin from changing their own role
                        if (user._id.toString() === req.user.id.toString()) {
                                    return res.status(400).json({
                                                success: false,
                                                message: "You cannot change your own role"
                                    });
                        }

                        user.role = role;
                        await user.save();

                        // if role changed to instructor create instructor profile
                        if (role === 'instructor') {
                                    const existingProfile = await InstructorProfile.findOne({
                                                user: user._id
                                    });
                                    if (!existingProfile) {
                                                await InstructorProfile.create({ user: user._id });
                                    }
                        }

                        return res.status(200).json({
                                    success: true,
                                    message: `User role updated to ${role} successfully`,
                                    data: user
                        });

            } catch (error) {
                        next(error);
            }
};

// PATCH /api/admin/users/:userId/status
export const updateUserStatus = async (req, res, next) => {
            try {
                        const { isActive } = req.body;

                        const user = await User.findById(req.params.userId);
                        if (!user) {
                                    return res.status(404).json({
                                                success: false,
                                                message: "User not found"
                                    });
                        }

                        // prevent admin from deactivating themselves
                        if (user._id.toString() === req.user.id.toString()) {
                                    return res.status(400).json({
                                                success: false,
                                                message: "You cannot deactivate your own account"
                                    });
                        }

                        user.isActive = isActive;
                        await user.save();

                        return res.status(200).json({
                                    success: true,
                                    message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
                                    data: user
                        });

            } catch (error) {
                        next(error);
            }
};

// DELETE /api/admin/users/:userId
export const deleteUser = async (req, res, next) => {
            try {
                        const user = await User.findById(req.params.userId);
                        if (!user) {
                                    return res.status(404).json({
                                                success: false,
                                                message: "User not found"
                                    });
                        }

                        // prevent admin from deleting themselves
                        if (user._id.toString() === req.user.id.toString()) {
                                    return res.status(400).json({
                                                success: false,
                                                message: "You cannot delete your own account"
                                    });
                        }

                        await User.findByIdAndDelete(req.params.userId);

                        return res.status(200).json({
                                    success: true,
                                    message: "User deleted successfully"
                        });

            } catch (error) {
                        next(error);
            }
};

// ---- STUDENT MANAGEMENT ----

// GET /api/admin/students
export const getAllStudents = async (req, res, next) => {
            try {
                        const page = parseInt(req.query.page) || 1;
                        const limit = parseInt(req.query.limit) || 10;
                        const skip = (page - 1) * limit;

                        const students = await User.find({ role: 'student' })
                                    .select('-password')
                                    .skip(skip)
                                    .limit(limit)
                                    .sort({ createdAt: -1 });

                        const total = await User.countDocuments({ role: 'student' });

                        return res.status(200).json({
                                    success: true,
                                    data: students,
                                    pagination: {
                                                total,
                                                page,
                                                limit,
                                                totalPages: Math.ceil(total / limit)
                                    }
                        });

            } catch (error) {
                        next(error);
            }
};

// GET /api/admin/students/:studentId
export const getStudentDetails = async (req, res, next) => {
            try {
                        const student = await User.findOne({
                                    _id: req.params.studentId,
                                    role: 'student'
                        }).select('-password');

                        if (!student) {
                                    return res.status(404).json({
                                                success: false,
                                                message: "Student not found"
                                    });
                        }

                        // get student enrollments
                        const enrollments = await Enrollment.find({
                                    student: req.params.studentId
                        }).populate('course', 'title category level');

                        // get student certificates
                        const certificates = await Certificate.find({
                                    student: req.params.studentId
                        }).populate('course', 'title');

                        // get student quiz results
                        const quizResults = await QuizResult.find({
                                    student: req.params.studentId
                        }).populate('quiz', 'title passingScore');

                        return res.status(200).json({
                                    success: true,
                                    data: {
                                                student,
                                                enrollments,
                                                certificates,
                                                quizResults
                                    }
                        });

            } catch (error) {
                        next(error);
            }
};

// ---- INSTRUCTOR MANAGEMENT ----

// GET /api/admin/instructors
export const getAllInstructors = async (req, res, next) => {
            try {
                        const page = parseInt(req.query.page) || 1;
                        const limit = parseInt(req.query.limit) || 10;
                        const skip = (page - 1) * limit;

                        const instructors = await User.find({ role: 'instructor' })
                                    .select('-password')
                                    .skip(skip)
                                    .limit(limit)
                                    .sort({ createdAt: -1 });

                        const total = await User.countDocuments({ role: 'instructor' });

                        return res.status(200).json({
                                    success: true,
                                    data: instructors,
                                    pagination: {
                                                total,
                                                page,
                                                limit,
                                                totalPages: Math.ceil(total / limit)
                                    }
                        });

            } catch (error) {
                        next(error);
            }
};

// GET /api/admin/instructors/:instructorId
export const getInstructorDetails = async (req, res, next) => {
            try {
                        const instructor = await User.findOne({
                                    _id: req.params.instructorId,
                                    role: 'instructor'
                        }).select('-password');

                        if (!instructor) {
                                    return res.status(404).json({
                                                success: false,
                                                message: "Instructor not found"
                                    });
                        }

                        // get instructor profile
                        const profile = await InstructorProfile.findOne({
                                    user: req.params.instructorId
                        });

                        // get instructor courses
                        const courses = await Course.find({
                                    instructor: req.params.instructorId
                        });

                        // total students across all courses
                        const totalStudents = courses.reduce(
                                    (total, course) => total + course.enrolledStudents.length, 0
                        );

                        return res.status(200).json({
                                    success: true,
                                    data: {
                                                instructor,
                                                profile,
                                                totalCourses: courses.length,
                                                totalStudents,
                                                courses
                                    }
                        });

            } catch (error) {
                        next(error);
            }
};

// PATCH /api/admin/instructors/:instructorId/verify
export const verifyInstructor = async (req, res, next) => {
            try {
                        const { isVerified } = req.body;

                        const instructor = await User.findOne({
                                    _id: req.params.instructorId,
                                    role: 'instructor'
                        });

                        if (!instructor) {
                                    return res.status(404).json({
                                                success: false,
                                                message: "Instructor not found"
                                    });
                        }

                        // update instructor profile verified status
                        await InstructorProfile.findOneAndUpdate(
                                    { user: req.params.instructorId },
                                    { isVerified },
                                    { new: true }
                        );

                        return res.status(200).json({
                                    success: true,
                                    message: `Instructor ${isVerified ? 'verified' : 'unverified'} successfully`
                        });

            } catch (error) {
                        next(error);
            }
};

// ---- COURSE MANAGEMENT ----

// GET /api/admin/courses
export const getAllCourses = async (req, res, next) => {
            try {
                        const page = parseInt(req.query.page) || 1;
                        const limit = parseInt(req.query.limit) || 10;
                        const skip = (page - 1) * limit;

                        const filter = {};
                        if (req.query.category) filter.category = req.query.category;
                        if (req.query.isPublished !== undefined) {
                                    filter.isPublished = req.query.isPublished === 'true';
                        }

                        const courses = await Course.find(filter)
                                    .populate('instructor', 'name email')
                                    .skip(skip)
                                    .limit(limit)
                                    .sort({ createdAt: -1 });

                        const total = await Course.countDocuments(filter);

                        return res.status(200).json({
                                    success: true,
                                    data: courses,
                                    pagination: {
                                                total,
                                                page,
                                                limit,
                                                totalPages: Math.ceil(total / limit)
                                    }
                        });

            } catch (error) {
                        next(error);
            }
};

// GET /api/admin/courses/:courseId
export const getAdminSingleCourse = async (req, res, next) => {
            try {
                        const course = await Course.findById(req.params.courseId)
                                    .populate('instructor', 'name email')
                                    .populate('lessons')
                                    .populate('enrolledStudents', 'name email');

                        if (!course) {
                                    return res.status(404).json({
                                                success: false,
                                                message: "Course not found"
                                    });
                        }

                        return res.status(200).json({
                                    success: true,
                                    data: course
                        });

            } catch (error) {
                        next(error);
            }
};

// DELETE /api/admin/courses/:courseId
export const deleteCourse = async (req, res, next) => {
            try {
                        const course = await Course.findById(req.params.courseId);
                        if (!course) {
                                    return res.status(404).json({
                                                success: false,
                                                message: "Course not found"
                                    });
                        }

                        // delete all lessons
                        await Lesson.deleteMany({ course: req.params.courseId });

                        // delete all quizzes
                        await Quiz.deleteMany({ course: req.params.courseId });

                        // delete all enrollments
                        await Enrollment.deleteMany({ course: req.params.courseId });

                        // delete all certificates
                        await Certificate.deleteMany({ course: req.params.courseId });

                        // delete the course
                        await Course.findByIdAndDelete(req.params.courseId);

                        return res.status(200).json({
                                    success: true,
                                    message: "Course and all related data deleted successfully"
                        });

            } catch (error) {
                        next(error);
            }
};

// PATCH /api/admin/courses/:courseId/moderate
export const moderateCourse = async (req, res, next) => {
            try {
                        const { isPublished, moderationNote } = req.body;

                        const course = await Course.findById(req.params.courseId);
                        if (!course) {
                                    return res.status(404).json({
                                                success: false,
                                                message: "Course not found"
                                    });
                        }

                        course.isPublished = isPublished;
                        if (moderationNote) course.moderationNote = moderationNote;
                        await course.save();

                        return res.status(200).json({
                                    success: true,
                                    message: `Course ${isPublished ? 'approved' : 'rejected'} successfully`,
                                    data: course
                        });

            } catch (error) {
                        next(error);
            }
};

// ---- ANALYTICS AND REPORTING ----

// GET /api/admin/analytics
export const getAnalytics = async (req, res, next) => {
            try {
                        // user counts
                        const totalUsers = await User.countDocuments();
                        const totalStudents = await User.countDocuments({ role: 'student' });
                        const totalInstructors = await User.countDocuments({ role: 'instructor' });

                        // course counts
                        const totalCourses = await Course.countDocuments();
                        const publishedCourses = await Course.countDocuments({ isPublished: true });
                        const draftCourses = await Course.countDocuments({ isPublished: false });

                        // enrollment counts
                        const totalEnrollments = await Enrollment.countDocuments();
                        const completedEnrollments = await Enrollment.countDocuments({
                                    isCompleted: true
                        });

                        // certificate counts
                        const totalCertificates = await Certificate.countDocuments();

                        // top 5 most enrolled courses
                        const topCourses = await Course.find()
                                    .populate('instructor', 'name')
                                    .sort({ 'enrolledStudents.length': -1 })
                                    .limit(5)
                                    .select('title enrolledStudents ratings category');

                        // new users in last 30 days
                        const thirtyDaysAgo = new Date();
                        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                        const newUsers = await User.countDocuments({
                                    createdAt: { $gte: thirtyDaysAgo }
                        });

                        // new enrollments in last 30 days
                        const newEnrollments = await Enrollment.countDocuments({
                                    createdAt: { $gte: thirtyDaysAgo }
                        });

                        return res.status(200).json({
                                    success: true,
                                    data: {
                                                users: {
                                                            total: totalUsers,
                                                            students: totalStudents,
                                                            instructors: totalInstructors,
                                                            newUsersLast30Days: newUsers
                                                },
                                                courses: {
                                                            total: totalCourses,
                                                            published: publishedCourses,
                                                            drafts: draftCourses,
                                                            topCourses
                                                },
                                                enrollments: {
                                                            total: totalEnrollments,
                                                            completed: completedEnrollments,
                                                            newEnrollmentsLast30Days: newEnrollments,
                                                            completionRate: totalEnrollments > 0
                                                                        ? Math.round((completedEnrollments / totalEnrollments) * 100)
                                                                        : 0
                                                },
                                                certificates: {
                                                            total: totalCertificates
                                                }
                                    }
                        });

            } catch (error) {
                        next(error);
            }
};

// GET /api/admin/analytics/courses
export const getCourseAnalytics = async (req, res, next) => {
            try {
                        // enrollments per category
                        const enrollmentsByCategory = await Course.aggregate([
                                    {
                                                $group: {
                                                            _id: '$category',
                                                            totalCourses: { $sum: 1 },
                                                            totalStudents: { $sum: { $size: '$enrolledStudents' } }
                                                }
                                    },
                                    { $sort: { totalStudents: -1 } }
                        ]);

                        // enrollments per level
                        const enrollmentsByLevel = await Course.aggregate([
                                    {
                                                $group: {
                                                            _id: '$level',
                                                            totalCourses: { $sum: 1 },
                                                            totalStudents: { $sum: { $size: '$enrolledStudents' } }
                                                }
                                    }
                        ]);

                        return res.status(200).json({
                                    success: true,
                                    data: {
                                                enrollmentsByCategory,
                                                enrollmentsByLevel
                                    }
                        });

            } catch (error) {
                        next(error);
            }
};

// ---- CONTENT MODERATION ----

// POST /api/admin/reports
// any logged in user can submit a report
export const submitReport = async (req, res, next) => {
            try {
                        const { contentType, contentId, reason, description } = req.body;

                        // check if user has already reported this content
                        const existingReport = await Report.findOne({
                                    reportedBy: req.user.id,
                                    contentId,
                                    contentType
                        });

                        if (existingReport) {
                                    return res.status(400).json({
                                                success: false,
                                                message: "You have already reported this content"
                                    });
                        }

                        const report = await Report.create({
                                    reportedBy: req.user.id,
                                    contentType,
                                    contentId,
                                    reason,
                                    description
                        });

                        return res.status(201).json({
                                    success: true,
                                    message: "Report submitted successfully",
                                    data: report
                        });

            } catch (error) {
                        next(error);
            }
};

// GET /api/admin/reports
// admin only — get all reports
export const getAllReports = async (req, res, next) => {
            try {
                        const page = parseInt(req.query.page) || 1;
                        const limit = parseInt(req.query.limit) || 10;
                        const skip = (page - 1) * limit;

                        // filters
                        const filter = {};
                        if (req.query.status) filter.status = req.query.status;
                        if (req.query.contentType) filter.contentType = req.query.contentType;
                        if (req.query.reason) filter.reason = req.query.reason;

                        const reports = await Report.find(filter)
                                    .populate('reportedBy', 'name email role')
                                    .populate('reviewedBy', 'name email')
                                    .skip(skip)
                                    .limit(limit)
                                    .sort({ createdAt: -1 }); // newest reports first

                        const total = await Report.countDocuments(filter);

                        return res.status(200).json({
                                    success: true,
                                    data: reports,
                                    pagination: {
                                                total,
                                                page,
                                                limit,
                                                totalPages: Math.ceil(total / limit)
                                    }
                        });

            } catch (error) {
                        next(error);
            }
};

// GET /api/admin/reports/:reportId
// admin only — get single report
export const getSingleReport = async (req, res, next) => {
            try {
                        const report = await Report.findById(req.params.reportId)
                                    .populate('reportedBy', 'name email role')
                                    .populate('reviewedBy', 'name email');

                        if (!report) {
                                    return res.status(404).json({
                                                success: false,
                                                message: "Report not found"
                                    });
                        }

                        return res.status(200).json({
                                    success: true,
                                    data: report
                        });

            } catch (error) {
                        next(error);
            }
};

// PATCH /api/admin/reports/:reportId/review
// admin only — review a report
export const reviewReport = async (req, res, next) => {
            try {
                        const { status, reviewNote } = req.body;

                        const report = await Report.findById(req.params.reportId);
                        if (!report) {
                                    return res.status(404).json({
                                                success: false,
                                                message: "Report not found"
                                    });
                        }

                        // cannot review an already resolved or dismissed report
                        if (report.status === 'resolved' || report.status === 'dismissed') {
                                    return res.status(400).json({
                                                success: false,
                                                message: `Report has already been ${report.status}`
                                    });
                        }

                        // update report
                        report.status = status;
                        report.reviewNote = reviewNote;
                        report.reviewedBy = req.user.id;
                        report.reviewedAt = new Date();
                        await report.save();

                        // if resolved take action on the content
                        if (status === 'resolved') {
                                    if (report.contentType === 'course') {
                                                // unpublish the course
                                                await Course.findByIdAndUpdate(report.contentId, {
                                                            isPublished: false,
                                                            moderationNote: reviewNote
                                                });
                                    }

                                    if (report.contentType === 'user') {
                                                // deactivate the user
                                                await User.findByIdAndUpdate(report.contentId, {
                                                            isActive: false
                                                });
                                    }

                                    if (report.contentType === 'lesson') {
                                                // you can add lesson specific action here
                                    }
                        }

                        return res.status(200).json({
                                    success: true,
                                    message: `Report ${status} successfully`,
                                    data: report
                        });

            } catch (error) {
                        next(error);
            }
};

// GET /api/admin/reports/stats
// admin only — get report statistics
export const getReportStats = async (req, res, next) => {
            try {
                        // count by status
                        const totalReports = await Report.countDocuments();
                        const pendingReports = await Report.countDocuments({ status: 'pending' });
                        const reviewedReports = await Report.countDocuments({ status: 'reviewed' });
                        const resolvedReports = await Report.countDocuments({ status: 'resolved' });
                        const dismissedReports = await Report.countDocuments({ status: 'dismissed' });

                        // count by content type
                        const reportsByContentType = await Report.aggregate([
                                    {
                                                $group: {
                                                            _id: '$contentType',
                                                            count: { $sum: 1 }
                                                }
                                    }
                        ]);

                        // count by reason
                        const reportsByReason = await Report.aggregate([
                                    {
                                                $group: {
                                                            _id: '$reason',
                                                            count: { $sum: 1 }
                                                }
                                    },
                                    { $sort: { count: -1 } }
                        ]);

                        return res.status(200).json({
                                    success: true,
                                    data: {
                                                total: totalReports,
                                                byStatus: {
                                                            pending: pendingReports,
                                                            reviewed: reviewedReports,
                                                            resolved: resolvedReports,
                                                            dismissed: dismissedReports
                                                },
                                                byContentType: reportsByContentType,
                                                byReason: reportsByReason
                                    }
                        });

            } catch (error) {
                        next(error);
            }
};