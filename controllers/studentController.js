import Course from '../models/courseModel.js';
import Lesson from '../models/lessonModel.js';
import Enrollment from '../models/enrollmentModel.js';
import Quiz from '../models/quizModel.js';
import Certificate from '../models/certificateModel.js';
import User from '../models/userModel.js';
import crypto from 'crypto';
import QuizResult from '../models/quizresultModel.js';
import XpLog from '../models/xPlogModel.js';
import UserBadge from '../models/userBadgeModel.js';
import awardBadge from '../utils/awardBadge.js';
import { BADGES } from '../constants/badges.js'


// STUDENT DASHBOARD
// GET /api/student/dashboard
export const getStudentDashboard = async (req, res, next) => {
            try {
                        // get all enrollments for the logged in student
                        const enrollments = await Enrollment.find({ studentId: req.user.id })
                                    .populate('courseId', 'title thumbnail category level')
                                    .sort({ updatedAt: -1 });

                        // count completed courses
                        const completedCourses = enrollments.filter(e => e.isCompleted).length;

                        // count in progress courses
                        const inProgressCourses = enrollments.filter(e => !e.isCompleted).length;

                        // get certificates
                        const certificates = await Certificate.find({ studentId: req.user.id })
                                    .populate('courseId', 'title');

                        return res.status(200).json({
                                    success: true,
                                    data: {
                                                totalEnrolledCourses: enrollments.length,
                                                completedCourses,
                                                inProgressCourses,
                                                certificates: certificates.length,
                                                recentCourses: enrollments.slice(0, 5), // last 5 courses
                                    }
                        });

            } catch (error) {
                        next(error);
            }
};
export const getMyBadges = async (req, res, next) => {
            try {
                        const earned = await UserBadge.find({ userId: req.user.id });
                        const earnedMap = new Map(earned.map(b => [b.badgeCode, b.createdAt]));

                        const catalog = Object.values(BADGES).map(badge => ({
                                    code: badge.code,
                                    title: badge.title,
                                    description: badge.description,
                                    earned: earnedMap.has(badge.code),
                                    earnedAt: earnedMap.get(badge.code) || null
                        }));

                        return res.status(200).json({
                                    success: true,
                                    data: catalog
                        });

            } catch (error) {
                        next(error);
            }
};

export const getMyStreak = async (req, res, next) => {
            try {
                        const user = await User.findById(req.user.id).select('currentStreak longestStreak lastActiveDate streakDates');

                        if (!user) {
                                    return res.status(404).json({
                                                success: false,
                                                message: "User not found"
                                    });
                        }

                        return res.status(200).json({
                                    success: true,
                                    data: {
                                                currentStreak: user.currentStreak,
                                                longestStreak: user.longestStreak,
                                                lastActiveDate: user.lastActiveDate,
                                                days: (user.streakDates || []).map(d => d.toISOString().split('T')[0])
                                    }
                        });

            } catch (error) {
                        next(error);
            }
};

// XP needed per level — simple flat curve for now (adjust freely later,
// this is a placeholder until a real leveling curve is designed)
const XP_PER_LEVEL = 100;

// XP 
// GET /api/student/xp
export const getMyXp = async (req, res, next) => {
            try {
                        const user = await User.findById(req.user.id).select('xp');

                        if (!user) {
                                    return res.status(404).json({
                                                success: false,
                                                message: "User not found"
                                    });
                        }
                        // start of the current calendar week (Monday, midnight)
                        const now = new Date();
                        const startOfWeek = new Date(now);
                        const day = startOfWeek.getDay(); // 0 = Sunday, 1 = Monday, ...
                        const diffToMonday = day === 0 ? 6 : day - 1;
                        startOfWeek.setDate(startOfWeek.getDate() - diffToMonday);
                        startOfWeek.setHours(0, 0, 0, 0);

                        const weeklyLogs = await XpLog.find({
                                    userId: req.user.id,
                                    createdAt: { $gte: startOfWeek }
                        });

                        const weeklyXP = weeklyLogs.reduce((sum, log) => sum + log.amount, 0);
                        const level = Math.floor(user.xp / XP_PER_LEVEL) + 1;

                        return res.status(200).json({
                                    success: true,
                                    data: {
                                                totalXP: user.xp,
                                                weeklyXP,
                                                level
                                    }
                        });

            } catch (error) {
                        next(error);
            }
};

//MY LEARNING (full enrolled courses list)
// GET /api/student/my-courses
export const getMyCourses = async (req, res, next) => {
            try {
                        const page = parseInt(req.query.page) || 1;
                        const limit = parseInt(req.query.limit) || 10;
                        const skip = (page - 1) * limit;

                        const filter = { studentId: req.user.id };

                        // optional filtering: ?status=completed or ?status=in-progress
                        if (req.query.status === 'completed') filter.isCompleted = true;
                        if (req.query.status === 'in-progress') filter.isCompleted = false;

                        const enrollments = await Enrollment.find(filter)
                                    .populate('courseId', 'title thumbnail category level price instructorId')
                                    .skip(skip)
                                    .limit(limit)
                                    .sort({ updatedAt: -1 });

                        const total = await Enrollment.countDocuments(filter);

                        return res.status(200).json({
                                    success: true,
                                    data: enrollments,
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

// COURSE CATALOG 
// GET/api/student/courses
export const getCourseCatalog = async (req, res, next) => {
            try {
                        // pagination
                        const page = parseInt(req.query.page) || 1;
                        const limit = parseInt(req.query.limit) || 10;
                        const skip = (page - 1) * limit;

                        // filters
                        const filter = { isPublished: true }; // only show published courses

                        if (req.query.category) filter.category = req.query.category;
                        if (req.query.level) filter.level = req.query.level;
                        if (req.query.minPrice || req.query.maxPrice) {
                                    filter.price = {};
                                    if (req.query.minPrice) filter.price.$gte = parseInt(req.query.minPrice);
                                    if (req.query.maxPrice) filter.price.$lte = parseInt(req.query.maxPrice);
                        }

                        const courses = await Course.find(filter)
                                    .populate('instructorId', 'name avatar')
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

// COURSE ENROLLMENT
// POST /api/student/enroll
export const enrollCourse = async (req, res, next) => {
            try {
                        const { courseId } = req.body;

                        // check if course exists and is published
                        const course = await Course.findById(courseId);
                        if (!course) {
                                    return res.status(404).json({
                                                success: false,
                                                message: "Course not found"
                                    });
                        }

                        if (!course.isPublished) {
                                    return res.status(400).json({
                                                success: false,
                                                message: "Course is not available yet"
                                    });
                        }
                        if (course.price > 0) {
                                    return res.status(400).json({
                                                success: false,
                                                message: "This course requires payment. Please proceed to checkout."
                                    });
                        }

                        // check if student is already enrolled
                        const existingEnrollment = await Enrollment.findOne({
                                    studentId: req.user.id,
                                    courseId: courseId
                        });

                        if (existingEnrollment) {
                                    return res.status(400).json({
                                                success: false,
                                                message: "You are already enrolled in this course"
                                    });
                        }

                        // create enrollment
                        const enrollment = await Enrollment.create({
                                    studentId: req.user.id,
                                    courseId: courseId,
                                    completedLessonsId: [],
                                    progress: 0
                        });

                        // add student to course enrolledStudents
                        await Course.findByIdAndUpdate(courseId, {
                                    $push: { enrolledStudentsId: req.user.id }
                        });

                        // add course to student enrolledCourses
                        await User.findByIdAndUpdate(req.user.id, {
                                    $push: { enrolledCoursesId: courseId }
                        });

                        return res.status(201).json({
                                    success: true,
                                    message: "Successfully enrolled in course",
                                    data: enrollment
                        });

            } catch (error) {
                        next(error);
            }
};

//VIDEO LESSONS
// GET /api/student/courses/:courseId/lessons
export const getCourseLessons = async (req, res, next) => {
            try {
                        const { courseId } = req.params;


                        // check if student is enrolled
                        const enrollment = await Enrollment.findOne({
                                    studentId: req.user.id,//correction
                                    courseId: courseId
                        });

                        if (!enrollment) {
                                    return res.status(403).json({
                                                success: false,
                                                message: "You are not enrolled in this course"
                                    });
                        }

                        // get all lessons for this course
                        const lessons = await Lesson.find({ courseId: courseId })
                                    .sort({ order: 1 }); // sort by order


                        // mark which lessons are completed
                        const lessonsWithProgress = lessons.map(lesson => ({
                                    ...lesson.toObject(),
                                    isCompleted: enrollment.completedLessonsId
                                                .map(id => id.toString())
                                                .includes(lesson._id.toString())
                        }));

                        return res.status(200).json({
                                    success: true,
                                    data: lessonsWithProgress
                        });

            } catch (error) {
                        next(error);
            }
};

//DOWNLOADABLE RESOURCES
// GET /api/student/lessons/:lessonId/resources
export const getLessonResources = async (req, res, next) => {
            try {
                        const { lessonId } = req.params;

                        // get the lesson
                        const lesson = await Lesson.findById(lessonId);
                        if (!lesson) {
                                    return res.status(404).json({
                                                success: false,
                                                message: "Lesson not found"
                                    });
                        }

                        // check if student is enrolled in the course
                        const enrollment = await Enrollment.findOne({
                                    studentId: req.user.id,
                                    courseId: lesson.courseId//correction
                        });

                        if (!enrollment) {
                                    return res.status(403).json({
                                                success: false,
                                                message: "You are not enrolled in this course"
                                    });
                        }

                        return res.status(200).json({
                                    success: true,
                                    data: lesson.resources
                        });

            } catch (error) {
                        next(error);
            }
};

const XP_PER_LESSON = 10;

//PROGRESS TRACKING
// POST /api/student/lessons/complete
export const markLessonComplete = async (req, res, next) => {
            try {
                        const { lessonId } = req.body;

                        // check if lesson exists
                        const lesson = await Lesson.findById(lessonId);
                        if (!lesson) {
                                    return res.status(404).json({
                                                success: false,
                                                message: "Lesson not found"
                                    });
                        }

                        // find enrollment
                        const enrollment = await Enrollment.findOne({
                                    studentId: req.user.id,
                                    courseId: lesson.courseId
                        });

                        if (!enrollment) {
                                    return res.status(403).json({
                                                success: false,
                                                message: "You are not enrolled in this course"
                                    });
                        }

                        // check if lesson is already completed
                        const alreadyCompleted = enrollment.completedLessonsId
                                    .map(id => id.toString())
                                    .includes(lessonId);

                        let xpAwarded = 0; //change

                        if (!alreadyCompleted) {

                                    // capture this BEFORE pushing, so we can tell if this is
                                    // genuinely their first completed lesson for this enrollment
                                    const isFirstLessonForThisEnrollment = enrollment.completedLessonsId.length === 0;

                                    enrollment.completedLessonsId.push(lessonId);

                                    // only award XP the first time this specific lesson is completed —
                                    // alreadyCompleted being false guarantees this can't be re-triggered
                                    // by calling the endpoint again for the same lesson
                                    xpAwarded = XP_PER_LESSON;
                                    await User.findByIdAndUpdate(req.user.id, {
                                                $inc: { xp: XP_PER_LESSON }
                                    });

                                    // log the individual event so weekly XP can be calculated later —
                                    // without this, we'd only ever have the lifetime running total
                                    await XpLog.create({
                                                userId: req.user.id,
                                                amount: XP_PER_LESSON,
                                                source: 'lesson_complete',
                                                lessonId: lesson._id
                                    });
                                    // BADGE: Quick Learner
                                    // first lesson of THIS enrollment, completed within 24 hours
                                    // of when the student enrolled in the course
                                    if (isFirstLessonForThisEnrollment) {
                                                const hoursSinceEnrolled = (Date.now() - enrollment.createdAt.getTime()) / (1000 * 60 * 60);
                                                if (hoursSinceEnrolled <= 24) {
                                                            await awardBadge(req.user.id, BADGES.QUICK_LEARNER.code);
                                                }
                                    }
                        }


                        // recalculate progress
                        const totalLessons = await Lesson.countDocuments({ courseId: lesson.courseId });
                        enrollment.progress = Math.round(
                                    (enrollment.completedLessonsId.length / totalLessons) * 100
                        );

                        // check if course is completed
                        if (enrollment.progress === 100) {
                                    enrollment.isCompleted = true;
                                    enrollment.completedAt = new Date();
                        }

                        await enrollment.save();

                        return res.status(200).json({
                                    success: true,
                                    message: "Lesson marked as complete",
                                    data: {
                                                progress: enrollment.progress,
                                                isCompleted: enrollment.isCompleted,
                                                completedLessonsId: enrollment.completedLessonsId.length,
                                                totalLessons,
                                                xpAwarded
                                    }
                        });

            } catch (error) {
                        next(error);
            }
};

// GET /api/student/courses/:courseId/progress
export const getCourseProgress = async (req, res, next) => {
            try {
                        const { courseId } = req.params;

                        const enrollment = await Enrollment.findOne({
                                    studentId: req.user.id,//corrections
                                    courseId: courseId
                        }).populate('completedLessonsId', 'title order');

                        if (!enrollment) {
                                    return res.status(404).json({
                                                success: false,
                                                message: "Enrollment not found"
                                    });
                        }

                        const totalLessons = await Lesson.countDocuments({ courseId: courseId });//corrections

                        return res.status(200).json({
                                    success: true,
                                    data: {
                                                progress: enrollment.progress,
                                                isCompleted: enrollment.isCompleted,
                                                completedAt: enrollment.completedAt,
                                                completedLessonsId: enrollment.completedLessonsId,//corrections
                                                totalLessons
                                    }
                        });

            } catch (error) {
                        next(error);
            }
};

//  QUIZZES AND ASSESSMENTS
// GET /api/student/courses/:courseId/quizzes
export const getCourseQuizzes = async (req, res, next) => {
            try {
                        const { courseId } = req.params;

                        // check if enrolled
                        const enrollment = await Enrollment.findOne({
                                    studentId: req.user.id,
                                    courseId: courseId
                        });

                        if (!enrollment) {
                                    return res.status(403).json({
                                                success: false,
                                                message: "You are not enrolled in this course"
                                    });
                        }

                        const quizzes = await Quiz.find({ courseId: courseId });

                        return res.status(200).json({
                                    success: true,
                                    data: quizzes
                        });

            } catch (error) {
                        next(error);
            }
};

// POST /api/student/quizzes/:quizId/submit
export const submitQuiz = async (req, res, next) => {
            try {
                        const { quizId } = req.params;
                        const { answers, timeTaken } = req.body;

                        // find the quiz
                        const quiz = await Quiz.findById(quizId);
                        if (!quiz) {
                                    return res.status(404).json({
                                                success: false,
                                                message: "Quiz not found"
                                    });
                        }

                        // check if enrolled
                        const enrollment = await Enrollment.findOne({
                                    studentId: req.user.id,
                                    courseId: quiz.courseId
                        });

                        if (!enrollment) {
                                    return res.status(403).json({
                                                success: false,
                                                message: "You are not enrolled in this course"
                                    });
                        }

                        // calculate score
                        let correctAnswers = 0;
                        answers.forEach(answer => {
                                    const question = quiz.questions[answer.questionIndex];
                                    if (question && question.correctAnswer === answer.selectedAnswer) {
                                                correctAnswers++;
                                    }
                        });

                        const score = Math.round((correctAnswers / quiz.questions.length) * 100);
                        const passed = score >= quiz.passingScore;

                        // save quiz result
                        const quizResult = await QuizResult.create({
                                    studentId: req.user.id,
                                    quizId: quizId,
                                    courseId: quiz.courseId,
                                    answers,
                                    score,
                                    passed,
                                    timeTaken
                        });

                        return res.status(200).json({
                                    success: true,
                                    message: passed ? "Congratulations! You passed the quiz" : "You did not pass. Please try again",
                                    data: {
                                                score,
                                                passed,
                                                correctAnswers,
                                                totalQuestions: quiz.questions.length,
                                                passingScore: quiz.passingScore,
                                                timeTaken
                                    }
                        });

            } catch (error) {
                        next(error);
            }
};

//CERTIFICATE
// POST /api/student/courses/:courseId/certificate
export const generateCertificate = async (req, res, next) => {
            try {
                        const { courseId } = req.params;

                        // check enrollment
                        const enrollment = await Enrollment.findOne({
                                    studentId: req.user.id,
                                    courseId: courseId
                        });

                        if (!enrollment) {
                                    return res.status(404).json({
                                                success: false,
                                                message: "Enrollment not found"
                                    });
                        }

                        // only generate if course is completed
                        if (!enrollment.isCompleted) {
                                    return res.status(400).json({
                                                success: false,
                                                message: "You must complete the course before getting a certificate"
                                    });
                        }

                        // check if certificate already exists
                        const existingCertificate = await Certificate.findOne({
                                    studentId: req.user.id,
                                    courseId: courseId
                        });

                        if (existingCertificate) {
                                    return res.status(200).json({
                                                success: true,
                                                message: "Certificate already generated",
                                                data: existingCertificate
                                    });
                        }

                        // generate unique certificate ID
                        const certificateId = crypto.randomBytes(16).toString('hex').toUpperCase();

                        // create certificate
                        const certificate = await Certificate.create({
                                    studentId: req.user.id,
                                    courseId: courseId,
                                    enrollmentId: enrollment._id,
                                    certificateId
                        });

                        // add certificate to student
                        await User.findByIdAndUpdate(req.user.id, {
                                    $push: { certificates: certificate._id }
                        });

                        return res.status(201).json({
                                    success: true,
                                    message: "Certificate generated successfully",
                                    data: certificate
                        });

            } catch (error) {
                        next(error);
            }
};

// GET /api/student/certificates
export const getStudentCertificates = async (req, res, next) => {
            try {
                        const certificates = await Certificate.find({ studentId: req.user.id })
                                    .populate('course', 'title thumbnail instructor')
                                    .sort({ createdAt: -1 });

                        return res.status(200).json({
                                    success: true,
                                    data: certificates
                        });

            } catch (error) {
                        next(error);
            }
};