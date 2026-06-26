import express from 'express';
import { initializePayment, verifyPayment, paystackWebhook, getInvoice, getPaymentHistory } from '../controllers/paymentController.js';

import validate from '../validators/paymentValidator.js';

import { initializePaymentSchema, verifyPaymentSchema } from '../validators/paymentValidator.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const paymentRoutes = express.Router();

// ❌ no auth — called directly by paystack
// must be before express.json() middleware in app.js
paymentRoutes.post('/webhook', paystackWebhook);

// 🔒 auth required
paymentRoutes.post('/initialize', authMiddleware, validate(initializePaymentSchema), initializePayment);
paymentRoutes.post('/verify', authMiddleware, validate(verifyPaymentSchema), verifyPayment);
paymentRoutes.get('/invoice/:reference', authMiddleware, getInvoice);
paymentRoutes.get('/history', authMiddleware, getPaymentHistory);

export default paymentRoutes;