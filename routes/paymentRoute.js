
import express from 'express';
import { initializePayment, verifyPayment, paystackWebhook, getInvoice, getPaymentHistory } from '../controllers/paymentController.js';

import validate from '../validators/paymentValidator.js';

import { initializePaymentSchema, verifyPaymentSchema } from '../validators/paymentValidator.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const paymentRoutes = express.Router();

//no auth — called directly by paystack
// express.raw() here means this route reads the raw body regardless of
// where this router is mounted relative to express.json() in app.js.
// Do NOT also register app.post('/api/payment/webhook', ...) separately
// in app.js — that would create a duplicate/conflicting route.
paymentRoutes.post('/webhook', express.raw({ type: 'application/json' }), paystackWebhook);

// auth required
paymentRoutes.post('/initialize', authMiddleware, validate(initializePaymentSchema), initializePayment);
paymentRoutes.post('/verify', authMiddleware, validate(verifyPaymentSchema), verifyPayment);
paymentRoutes.get('/invoice/:reference', authMiddleware, getInvoice);
paymentRoutes.get('/history', authMiddleware, getPaymentHistory);

export default paymentRoutes;





// import express from 'express';
// import { initializePayment, verifyPayment, paystackWebhook, getInvoice, getPaymentHistory } from '../controllers/paymentController.js';

// import validate from '../validators/paymentValidator.js';

// import { initializePaymentSchema, verifyPaymentSchema } from '../validators/paymentValidator.js';
// import authMiddleware from '../middlewares/authMiddleware.js';

// const paymentRoutes = express.Router();

// // ❌ no auth — called directly by paystack
// // must be before express.json() middleware in app.js
// paymentRoutes.post('/webhook', paystackWebhook);

// // 🔒 auth required
// paymentRoutes.post('/initialize', authMiddleware, validate(initializePaymentSchema), initializePayment);
// paymentRoutes.post('/verify', authMiddleware, validate(verifyPaymentSchema), verifyPayment);
// paymentRoutes.get('/invoice/:reference', authMiddleware, getInvoice);
// paymentRoutes.get('/history', authMiddleware, getPaymentHistory);

// export default paymentRoutes;