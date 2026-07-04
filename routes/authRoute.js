import express from 'express';
import { register, login, logout, getProfile, updateProfile, changePassword, forgotPassword, verifyOTP, resetPassword, resendOTP } from '../controllers/authController.js';

import validate from '../validators/authValidator.js';
import { registerSchema, loginSchema, updateProfileSchema, changePasswordSchema, forgotPasswordSchema, verifyOTPSchema, resetPasswordSchema, } from '../validators/authValidator.js';

import authMiddleware from '../middlewares/authMiddleware.js';
import { avatarUpload } from '../middlewares/uploadMiddleware.js';

const authRoutes = express.Router();

// no auth needed — user has no token yet
authRoutes.post('/register', validate(registerSchema), register);
authRoutes.post('/login', validate(loginSchema), login);

//  auth required
authRoutes.post('/logout', authMiddleware, logout);
authRoutes.get('/me', authMiddleware, getProfile);
authRoutes.patch('/update', authMiddleware, avatarUpload.single('avatar'), validate(updateProfileSchema), updateProfile);
authRoutes.patch('/changepassword', authMiddleware, validate(changePasswordSchema), changePassword);

authRoutes.post('/forgotpassword', validate(forgotPasswordSchema), forgotPassword);
authRoutes.post('/verifyotp', validate(verifyOTPSchema), verifyOTP);
authRoutes.post('/resetpassword', validate(resetPasswordSchema), resetPassword);
authRoutes.post('/resendotp', validate(forgotPasswordSchema), resendOTP);

export default authRoutes;