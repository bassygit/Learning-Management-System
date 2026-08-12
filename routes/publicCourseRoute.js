import express from 'express';
import { getPublicCourseCatalog, getPublicCourseDetail, getPublicCourseLessons } from '../controllers/publicCourseController.js';

const publicCourseRoutes = express.Router();


publicCourseRoutes.get('/allcourses', getPublicCourseCatalog);
publicCourseRoutes.get('/:courseId', getPublicCourseDetail);
publicCourseRoutes.get('/:courseId/lessons', getPublicCourseLessons);

export default publicCourseRoutes;