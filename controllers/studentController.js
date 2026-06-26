import Course from '../models/courseModel.js';
import Lesson from '../models/lessonModel.js';
import Enrollment from '../models/enrollmentModel.js';
import Quiz from '../models/quizModel.js';
import QuizResult from '../models/quizResultModel.js';
import Certificate from '../models/certificateModel.js';
import User from '../models/userModel.js';
import crypto from 'crypto';

// ---- STUDENT DASHBOARD ----
// GET /api/student/dashboard
export const getStudentDashboard = async (req, res, next) => {
            try {
                        // get all enrollments for the logged in student
                        const enrollments = await Enrollment.find({ student: req.user.id })
                                    .populate('course', 'title thumbnail category level')
                                    .sort({ updatedAt: -1 });

                        // count completed courses
                        const completedCourses = enrollments.filter(e => e.isCompleted).length;

                        // count in progress courses
                        const inProgressCourses = enrollments.filter(e => !e.isCompleted).length;

                        // get certificates
                        const certificates = await Certificate.find({ student: req.user.id })
                                    .populate('course', 'title');

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

// ---- COURSE CATALOG ----
// GET /api/student/courses
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
                                    .populate('instructor', 'name avatar')
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

// ---- COURSE ENROLLMENT ----
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

                        // check if student is already enrolled
                        const existingEnrollment = await Enrollment.findOne({
                                    student: req.user.id,
                                    course: courseId
                        });

                        if (existingEnrollment) {
                                    return res.status(400).json({
                                                success: false,
                                                message: "You are already enrolled in this course"
                                    });
                        }

                        // create enrollment
                        const enrollment = await Enrollment.create({
                                    student: req.user.id,
                                    course: courseId,
                                    completedLessons: [],
                                    progress: 0
                        });

                        // add student to course enrolledStudents
                        await Course.findByIdAndUpdate(courseId, {
                                    $push: { enrolledStudents: req.user.id }
                        });

                        // add course to student enrolledCourses
                        await User.findByIdAndUpdate(req.user.id, {
                                    $push: { enrolledCourses: courseId }
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

// ---- VIDEO LESSONS ----
// GET /api/student/courses/:courseId/lessons
export const getCourseLessons = async (req, res, next) => {
            try {
                        const { courseId } = req.params;

                        // check if student is enrolled
                        const enrollment = await Enrollment.findOne({
                                    student: req.user.id,
                                    course: courseId
                        });

                        if (!enrollment) {
                                    return res.status(403).json({
                                                success: false,
                                                message: "You are not enrolled in this course"
                                    });
                        }

                        // get all lessons for this course
                        const lessons = await Lesson.find({ course: courseId })
                                    .sort({ order: 1 }); // sort by order

                        // mark which lessons are completed
                        const lessonsWithProgress = lessons.map(lesson => ({
                                    ...lesson.toObject(),
                                    isCompleted: enrollment.completedLessons
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

// ---- DOWNLOADABLE RESOURCES ----
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
                                    student: req.user.id,
                                    course: lesson.course
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

// ---- PROGRESS TRACKING ----
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
                                    student: req.user.id,
                                    course: lesson.course
                        });

                        if (!enrollment) {
                                    return res.status(403).json({
                                                success: false,
                                                message: "You are not enrolled in this course"
                                    });
                        }

                        // check if lesson is already completed
                        const alreadyCompleted = enrollment.completedLessons
                                    .map(id => id.toString())
                                    .includes(lessonId);

                        if (!alreadyCompleted) {
                                    enrollment.completedLessons.push(lessonId);
                        }

                        // recalculate progress
                        const totalLessons = await Lesson.countDocuments({ course: lesson.course });
                        enrollment.progress = Math.round(
                                    (enrollment.completedLessons.length / totalLessons) * 100
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
                                                completedLessons: enrollment.completedLessons.length,
                                                totalLessons
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
                                    student: req.user.id,
                                    course: courseId
                        }).populate('completedLessons', 'title order');

                        if (!enrollment) {
                                    return res.status(404).json({
                                                success: false,
                                                message: "Enrollment not found"
                                    });
                        }

                        const totalLessons = await Lesson.countDocuments({ course: courseId });

                        return res.status(200).json({
                                    success: true,
                                    data: {
                                                progress: enrollment.progress,
                                                isCompleted: enrollment.isCompleted,
                                                completedAt: enrollment.completedAt,
                                                completedLessons: enrollment.completedLessons,
                                                totalLessons
                                    }
                        });

            } catch (error) {
                        next(error);
            }
};

// ---- QUIZZES AND ASSESSMENTS ----
// GET /api/student/courses/:courseId/quizzes
export const getCourseQuizzes = async (req, res, next) => {
            try {
                        const { courseId } = req.params;

                        // check if enrolled
                        const enrollment = await Enrollment.findOne({
                                    student: req.user.id,
                                    course: courseId
                        });

                        if (!enrollment) {
                                    return res.status(403).json({
                                                success: false,
                                                message: "You are not enrolled in this course"
                                    });
                        }

                        const quizzes = await Quiz.find({ course: courseId });

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
                                    student: req.user.id,
                                    course: quiz.course
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
                                    student: req.user.id,
                                    quiz: quizId,
                                    course: quiz.course,
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

// ---- CERTIFICATE GENERATION ----
// POST /api/student/courses/:courseId/certificate
export const generateCertificate = async (req, res, next) => {
            try {
                        const { courseId } = req.params;

                        // check enrollment
                        const enrollment = await Enrollment.findOne({
                                    student: req.user.id,
                                    course: courseId
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
                                    student: req.user.id,
                                    course: courseId
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
                                    student: req.user.id,
                                    course: courseId,
                                    enrollment: enrollment._id,
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
                        const certificates = await Certificate.find({ student: req.user.id })
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