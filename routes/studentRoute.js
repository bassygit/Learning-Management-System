import express from 'express';

import { getStudentDashboard, getCourseCatalog, enrollCourse, getCourseLessons, getLessonResources, markLessonComplete, getCourseProgress, getCourseQuizzes, submitQuiz, generateCertificate, getStudentCertificates } from '../controllers/studentController.js';

import validate from '../validators/studentValidator.js';

import { enrollCourseSchema, completeLessonSchema, submitQuizSchema } from '../validators/studentValidator.js';

import authMiddleware, { studentOnly } from '../middlewares/authMiddleware.js';

const StudentRoutes = express.Router();

// ALL STUDENT ROUTES NEED AUTH

// dashboard
StudentRoutes.get('/dashboard', authMiddleware, studentOnly, getStudentDashboard);

// course catalog
StudentRoutes.get('/courses', authMiddleware, studentOnly, getCourseCatalog);

// enrollment
StudentRoutes.post('/enroll', authMiddleware, studentOnly, validate(enrollCourseSchema), enrollCourse);

// video lessons
StudentRoutes.get('/courses/:courseId/lessons', authMiddleware, studentOnly, getCourseLessons);

// downloadable resources
StudentRoutes.get('/lessons/:lessonId/resources', authMiddleware, studentOnly, getLessonResources);

// progress tracking
StudentRoutes.post('/lessons/complete', authMiddleware, studentOnly, validate(completeLessonSchema), markLessonComplete);
StudentRoutes.get('/courses/:courseId/progress', authMiddleware, studentOnly, getCourseProgress);

// quizzes
StudentRoutes.get('/courses/:courseId/quizzes', authMiddleware, studentOnly, getCourseQuizzes);
StudentRoutes.post('/quizzes/:quizId/submit', authMiddleware, studentOnly, validate(submitQuizSchema), submitQuiz);

// certificates
StudentRoutes.post('/courses/:courseId/certificate', authMiddleware, studentOnly, generateCertificate);
StudentRoutes.get('/certificates', authMiddleware, studentOnly, getStudentCertificates);

export default StudentRoutes;