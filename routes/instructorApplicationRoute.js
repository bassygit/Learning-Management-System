import express from 'express';
import { applyToBeInstructor, getMyApplication, withdrawApplication, getAllApplications, getSingleApplication, reviewApplication } from '../controllers/instructorApplicationController.js';

import validate from '../validators/authValidator.js';

import { instructorApplicationSchema } from '../validators/authValidator.js';

import { reviewApplicationSchema } from '../validators/authValidator.js';

import authMiddleware, { studentOnly, adminOnly } from '../middlewares/authMiddleware.js';

const instructorApplicationRoutes = express.Router();

// ---- STUDENT ROUTES ----
instructorApplicationRoutes.post('/apply', authMiddleware, studentOnly, validate(instructorApplicationSchema), applyToBeInstructor);
instructorApplicationRoutes.get('/myapplication', authMiddleware, getMyApplication);
instructorApplicationRoutes.delete('/withdraw', authMiddleware, studentOnly, withdrawApplication);

// ---- ADMIN ROUTES ----
instructorApplicationRoutes.get('/all', authMiddleware, adminOnly, getAllApplications);
instructorApplicationRoutes.get('/:applicationId', authMiddleware, adminOnly, getSingleApplication);
instructorApplicationRoutes.patch('/:applicationId/review', authMiddleware, adminOnly, validate(reviewApplicationSchema), reviewApplication);

export default instructorApplicationRoutes;