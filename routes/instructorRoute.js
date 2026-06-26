import express from 'express';
// import { thumbnailUpload, videoUpload, resourceUpload } from '../middlewares/uploadMiddleware.js'; // adjust path if different



import {
            getInstructorDashboard,
            createCourse,
            getInstructorCourses,
            getSingleInstructorCourse,
            updateCourse,
            deleteCourse,
            togglePublishCourse,
            createLesson,
            getCourseLessons,
            updateLesson,
            deleteLesson,
            uploadLessonResource,
            deleteLessonResource,
            createQuiz,
            getCourseQuizzes,
            deleteQuiz,
            getCourseStudents,
            getStudentProgress
} from '../controllers/instructorController.js';

import validate, { uploadLessonResourceSchema } from '../validators/instructorValidator.js';
import { createCourseSchema, updateCourseSchema, createLessonSchema, updateLessonSchema, createQuizSchema } from '../validators/instructorValidator.js';
import authMiddleware, { instructorOnly } from '../middlewares/authMiddleware.js';
import { resourceUpload, videoUpload } from '../middlewares/uploadMiddleware.js';

const instructorRoutes = express.Router();

// ALL INSTRUCTOR ROUTES NEED AUTH

// dashboard
instructorRoutes.get('/dashboard', authMiddleware, instructorOnly, getInstructorDashboard);

// course management
instructorRoutes.post('/create', authMiddleware, instructorOnly, validate(createCourseSchema), createCourse);
instructorRoutes.get('/courses', authMiddleware, instructorOnly, getInstructorCourses);
instructorRoutes.get('/courses/:courseId', authMiddleware, instructorOnly, getSingleInstructorCourse);
instructorRoutes.patch('/courses/:courseId', authMiddleware, instructorOnly, validate(updateCourseSchema), updateCourse);
instructorRoutes.delete('/courses/:courseId', authMiddleware, instructorOnly, deleteCourse);
instructorRoutes.patch('/courses/:courseId/publish', authMiddleware, instructorOnly, togglePublishCourse);

// lesson management
instructorRoutes.post('/courses/:courseId/lessons', authMiddleware, instructorOnly, validate(createLessonSchema), videoUpload.single("video"), createLesson);
instructorRoutes.get('/courses/:courseId/lessons', authMiddleware, instructorOnly, getCourseLessons);
instructorRoutes.put('/lessons/:lessonId', authMiddleware, instructorOnly, validate(updateLessonSchema), updateLesson);
instructorRoutes.delete('/lessons/:lessonId', authMiddleware, instructorOnly, deleteLesson);
instructorRoutes.post('/lessons/:lessonId/resources', authMiddleware, instructorOnly, validate(uploadLessonResourceSchema), resourceUpload.single("raw"), uploadLessonResource)

// quiz management
instructorRoutes.post('/courses/:courseId/quizzes', authMiddleware, instructorOnly, validate(createQuizSchema), createQuiz);
instructorRoutes.get('/courses/:courseId/quizzes', authMiddleware, instructorOnly, getCourseQuizzes);
instructorRoutes.delete('/quizzes/:quizId', authMiddleware, instructorOnly, deleteQuiz);

// student progress monitoring
instructorRoutes.get('/courses/:courseId/students', authMiddleware, instructorOnly, getCourseStudents);
instructorRoutes.get('/courses/:courseId/students/:studentId/progress', authMiddleware, instructorOnly, getStudentProgress);

export default instructorRoutes;