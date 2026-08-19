import awardBadge from '../utils/awardBadge.js';
import { BADGES } from '../constants/badges.js';
import User from '../models/userModel.js';
import InstructorProfile from '../models/instructorModel.js';
import bcrypt from 'bcryptjs';
import generateToken from '../utils/generateToken.js';
import OTP from '../models/otpModel.js';
import sendEmail from '../utils/sendEmail.js';
import { otpEmailTemplate, verifyEmailOtpTemplate } from '../utils/emailTemplates.js';
import jwt from 'jsonwebtoken';
import BlacklistedToken from '../models/blacklistedTokenModel.js';


const MAX_VERIFY_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 60 * 1000;   // 1 min between resends
const OTP_EXPIRY_MS = 10 * 60 * 1000;   // 10 min

const generateSixDigitOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

// REGISTER 
// POST /api/auth/register
export const register = async (req, res, next) => {
            try {
                        const { name, email, password } = req.body;

                        const existingUser = await User.findOne({ email });

                        if (existingUser && existingUser.isVerified) {
                                    return res.status(400).json({
                                                success: false,
                                                message: `User with email ${email} already exists`
                                    });
                        }

                        // unverified account already exists — just resend an OTP instead of erroring
                        if (existingUser && !existingUser.isVerified) {
                                    await OTP.deleteMany({ email, isUsed: false, purpose: 'email_verification' });

                                    const otp = generateSixDigitOtp();
                                    await OTP.create({
                                                email,
                                                otp,
                                                purpose: 'email_verification',
                                                expiresAt: new Date(Date.now() + OTP_EXPIRY_MS)
                                    });

                                    await sendEmail({
                                                to: email,
                                                subject: "Verify your Vercity account",
                                                html: verifyEmailOtpTemplate(existingUser.name, otp)
                                    });

                                    return res.status(200).json({
                                                success: true,
                                                message: "Account already pending verification. A new OTP has been sent to your email."
                                    });
                        }

                        // create new unverified user
                        const user = await User.create({ name, email, password });

                        const otp = generateSixDigitOtp();
                        await OTP.create({
                                    email,
                                    otp,
                                    purpose: 'email_verification',
                                    expiresAt: new Date(Date.now() + OTP_EXPIRY_MS)
                        });

                        try {
                                    await sendEmail({
                                                to: user.email,
                                                subject: "Verify your Vercity account",
                                                html: verifyEmailOtpTemplate(user.name, otp)
                                    });
                        } catch (emailError) {
                                    console.error("Failed to send verification email:", emailError);
                                    await User.findByIdAndDelete(user._id);
                                    await OTP.deleteMany({ email, purpose: 'email_verification' });
                                    return res.status(502).json({
                                                success: false,
                                                message: "Could not send verification email. Please try again."
                                    });
                        }

                        return res.status(201).json({
                                    success: true,
                                    message: "Registration successful. Please check your email for the OTP to verify your account."
                        });

            } catch (error) {
                        next(error);
            }
};

// VERIFY EMAIL OTP
// POST /api/auth/verify-email-otp
export const verifyEmailOTP = async (req, res, next) => {
            try {
                        const { email, otp } = req.body;

                        const user = await User.findOne({ email });
                        if (!user) {
                                    return res.status(404).json({ success: false, message: "No account found with this email" });
                        }
                        if (user.isVerified) {
                                    return res.status(400).json({ success: false, message: "This account is already verified" });
                        }

                        const otpRecord = await OTP.findOne({
                                    email,
                                    isUsed: false,
                                    purpose: 'email_verification'
                        }).sort({ createdAt: -1 });

                        if (!otpRecord) {
                                    return res.status(400).json({
                                                success: false,
                                                message: "No pending verification found. Please request a new OTP."
                                    });
                        }

                        if (otpRecord.expiresAt < new Date()) {
                                    await OTP.deleteOne({ _id: otpRecord._id });
                                    return res.status(400).json({
                                                success: false,
                                                message: "OTP has expired. Please request a new one."
                                    });
                        }

                        if (otpRecord.attempts >= MAX_VERIFY_ATTEMPTS) {
                                    await OTP.deleteOne({ _id: otpRecord._id });
                                    return res.status(429).json({
                                                success: false,
                                                message: "Too many failed attempts. Please request a new OTP."
                                    });
                        }

                        if (otpRecord.otp !== otp) {
                                    otpRecord.attempts += 1;
                                    await otpRecord.save();
                                    return res.status(400).json({
                                                success: false,
                                                message: `Incorrect OTP. ${MAX_VERIFY_ATTEMPTS - otpRecord.attempts} attempt(s) remaining.`
                                    });
                        }

                        otpRecord.isUsed = true;
                        await otpRecord.save();

                        user.isVerified = true;
                        await user.save();

                        sendEmail({
                                    to: user.email,
                                    subject: "Welcome to Vercity!",
                                    html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2>You're verified, ${user.name}!</h2>
                    <p>Welcome to Vercity — thank you for joining a platform built to serve your dream and passion for learning.</p>
                </div>
            `
                        }).catch((error) => {
                                    console.error("Failed to send welcome email:", error);
                        });

                        return res.status(200).json({
                                    success: true,
                                    message: "Email verified successfully. Welcome to Vercity!"
                        });

            } catch (error) {
                        next(error);
            }
};

// RESEND EMAIL VERIFICATION OTP
// POST /api/auth/resend-email-otp
export const resendEmailOTP = async (req, res, next) => {
            try {
                        const { email } = req.body;

                        const user = await User.findOne({ email });
                        if (!user) {
                                    return res.status(404).json({ success: false, message: "No account found with this email" });
                        }
                        if (user.isVerified) {
                                    return res.status(400).json({ success: false, message: "This account is already verified" });
                        }

                        const recentOTP = await OTP.findOne({
                                    email,
                                    purpose: 'email_verification',
                                    createdAt: { $gte: new Date(Date.now() - RESEND_COOLDOWN_MS) }
                        });

                        if (recentOTP) {
                                    return res.status(400).json({
                                                success: false,
                                                message: "Please wait 1 minute before requesting a new OTP"
                                    });
                        }

                        await OTP.deleteMany({ email, isUsed: false, purpose: 'email_verification' });

                        const otp = generateSixDigitOtp();
                        await OTP.create({
                                    email,
                                    otp,
                                    purpose: 'email_verification',
                                    expiresAt: new Date(Date.now() + OTP_EXPIRY_MS)
                        });

                        await sendEmail({
                                    to: email,
                                    subject: "Verify your Vercity account — Resend",
                                    html: verifyEmailOtpTemplate(user.name, otp)
                        });

                        return res.status(200).json({
                                    success: true,
                                    message: "A new OTP has been sent to your email"
                        });

            } catch (error) {
                        next(error);
            }
};

//LOGIN 
// POST /api/auth/login
export const login = async (req, res, next) => {
            try {
                        const { email, password } = req.body;

                        const user = await User.findOne({ email });
                        if (!user) {
                                    return res.status(401).json({
                                                success: false,
                                                message: "Invalid email or password"
                                    });
                        }

                        if (!user.isActive) {
                                    return res.status(401).json({
                                                success: false,
                                                message: "Your account has been deactivated. Contact support"
                                    });
                        }

                        const correctPassword = await bcrypt.compare(password, user.password);
                        if (!correctPassword) {
                                    return res.status(401).json({
                                                success: false,
                                                message: "Invalid email or password"
                                    });
                        }

                        if (!user.isVerified) {
                                    return res.status(403).json({
                                                success: false,
                                                message: "Please verify your email before logging in"
                                    });
                        }

                        // STREAK TRACKING
                        // normalize "today" to midnight so we're comparing calendar

                        const now = new Date();
                        const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

                        if (user.lastActiveDate) {
                                    const la = new Date(user.lastActiveDate);
                                    const lastActive = new Date(Date.UTC(la.getUTCFullYear(), la.getUTCMonth(), la.getUTCDate()));

                                    // difference in whole days between today and their last active day
                                    const diffDays = Math.round((today - lastActive) / (1000 * 60 * 60 * 24));

                                    if (diffDays === 0) {

                                                const todayStr = today.toISOString().split('T')[0];
                                                const alreadyRecorded = (user.streakDates || []).some(
                                                            d => new Date(d).toISOString().split('T')[0] === todayStr
                                                );
                                                if (!alreadyRecorded) {
                                                            user.streakDates.push(today);
                                                }

                                    } else if (diffDays === 1) {
                                                // logged in yesterday, then today — streak continues
                                                user.currentStreak += 1;
                                                user.lastActiveDate = today;
                                                user.streakDates.push(today)
                                    } else {
                                                // missed at least one day — streak resets to a fresh day 1
                                                user.currentStreak = 1;
                                                user.lastActiveDate = today;
                                                user.streakDates = [today]
                                    }
                        } else {
                                    // very first login ever recorded
                                    user.currentStreak = 1;
                                    user.lastActiveDate = today;
                                    user.streakDates = [today]
                        }

                        // track the best streak they've ever hit
                        if (user.currentStreak > user.longestStreak) {
                                    user.longestStreak = user.currentStreak;
                        }

                        await user.save();


                        if (user.currentStreak >= 30) {
                                    await awardBadge(user._id, BADGES.CONSISTENCY_STREAK.code);
                        }

                        // generate token
                        const token = await generateToken({
                                    id: user._id,
                                    email: user.email,
                                    role: user.role
                        });

                        return res.status(200).json({
                                    success: true,
                                    message: "Login successful",
                                    token,
                                    data: {
                                                currentStreak: user.currentStreak,
                                                longestStreak: user.longestStreak
                                    }
                        });

            } catch (error) {
                        next(error);
            }
};

export const logout = async (req, res, next) => {
            try {
                        // get token from header
                        const authHeader = req.headers.authorization || req.headers.Authorization;
                        const token = authHeader.split(" ")[1];

                        // add token to blacklist so it cannot be used again
                        await BlacklistedToken.create({
                                    token,
                                    expiresAt: new Date(Date.now() + 60 * 60 * 1000) // expires in 1 hour same as token
                        });

                        return res.status(200).json({
                                    success: true,
                                    message: "Logged out successfully"
                        });

            } catch (error) {
                        next(error);
            }
};

// GET PROFILE 
// GET /api/auth/me
export const getProfile = async (req, res, next) => {
            try {
                        const user = await User.findById(req.user.id)
                                    .select('-password')
                                    .populate('enrolledCoursesId', 'title thumbnail category')
                                    .populate('certificatesId', 'certificateId issuedAt');

                        return res.status(200).json({
                                    success: true,
                                    data: user
                        });

            } catch (error) {
                        next(error);
            }
};

//UPDATE PROFILE 
// PATCH /api/auth/me
export const updateProfile = async (req, res, next) => {
            try {
                        const { name } = req.body;

                        const updateData = {};
                        if (name) updateData.name = name;

                        // if new avatar uploaded
                        if (req.file) {
                                    // delete old avatar from cloudinary if exists
                                    const currentUser = await User.findById(req.user.id);
                                    if (currentUser.avatar) {
                                                const publicId = getPublicIdFromUrl(currentUser.avatar);
                                                await deleteFromCloudinary(publicId, 'image');
                                    }

                                    updateData.avatar = req.file.path; // new cloudinary URL
                        }

                        const updatedUser = await User.findByIdAndUpdate(
                                    req.user.id,
                                    updateData,
                                    { new: true, runValidators: true }
                        ).select('-password');

                        if (!updatedUser) {
                                    return res.status(404).json({ success: false, message: 'User not found' });
                        }

                        return res.status(200).json({
                                    success: true,
                                    message: "Profile updated successfully",
                                    data: updatedUser
                        });

            } catch (error) {
                        next(error);
            }
};

//CHANGE PASSWORD
// PATCH /api/auth/change-password
export const changePassword = async (req, res, next) => {
            try {
                        const { currentPassword, newPassword } = req.body;

                        // find user with password
                        const user = await User.findById(req.user.id);

                        // check if current password is correct
                        const isMatch = await bcrypt.compare(currentPassword, user.password);
                        if (!isMatch) {
                                    return res.status(401).json({
                                                success: false,
                                                message: "Current password is incorrect"
                                    });
                        }

                        // check if new password is same as current
                        const isSamePassword = await bcrypt.compare(newPassword, user.password);
                        if (isSamePassword) {
                                    return res.status(400).json({
                                                success: false,
                                                message: "New password cannot be the same as current password"
                                    });
                        }

                        // update password — pre save hook will hash it
                        user.password = newPassword;
                        await user.save();

                        return res.status(200).json({
                                    success: true,
                                    message: "Password changed successfully"
                        });

            } catch (error) {
                        next(error);
            }
};

//FORGOT PASSWORD
// POST /api/auth/forgot-password
export const forgotPassword = async (req, res, next) => {
            try {
                        const { email } = req.body;

                        // check if user exists
                        const user = await User.findOne({ email });
                        if (!user) {
                                    // for security dont reveal if email exists or not
                                    return res.status(200).json({
                                                success: true,
                                                message: "If this email exists, an OTP has been sent to it"
                                    });
                        }

                        // check if user account is active
                        if (!user.isActive) {
                                    return res.status(401).json({
                                                success: false,
                                                message: "Your account has been deactivated. Contact support"
                                    });
                        }

                        // delete any existing unused password-reset OTPs for this email
                        await OTP.deleteMany({ email, isUsed: false, purpose: 'password_reset' });

                        // generate 6 digit OTP
                        const otp = generateSixDigitOtp();
                        console.log('Generated OTP:', otp, 'for email:', email);

                        // set expiry to 10 minutes from now
                        const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

                        // save OTP to database
                        await OTP.create({
                                    email,
                                    otp,
                                    purpose: 'password_reset',
                                    expiresAt
                        });

                        // send OTP email
                        await sendEmail({
                                    to: email,
                                    subject: 'Password Reset OTP',
                                    html: otpEmailTemplate(user.name, otp)
                        });

                        return res.status(200).json({
                                    success: true,
                                    message: "If this email exists, an OTP has been sent to it"
                        });

            } catch (error) {
                        next(error);
            }
};

//VERIFY OTP (password reset)
// POST /api/auth/verify-otp
export const verifyOTP = async (req, res, next) => {
            try {
                        const { email, otp } = req.body;

                        // find the latest unused password-reset OTP for this email
                        const otpRecord = await OTP.findOne({
                                    email,
                                    isUsed: false,
                                    purpose: 'password_reset'
                        }).sort({ createdAt: -1 });

                        if (!otpRecord) {
                                    return res.status(400).json({
                                                success: false,
                                                message: "Invalid or expired OTP"
                                    });
                        }

                        // check if OTP has expired
                        if (otpRecord.expiresAt < new Date()) {
                                    await OTP.deleteOne({ _id: otpRecord._id });
                                    return res.status(400).json({
                                                success: false,
                                                message: "OTP has expired. Please request a new one"
                                    });
                        }

                        // check attempt lockout
                        if (otpRecord.attempts >= MAX_VERIFY_ATTEMPTS) {
                                    await OTP.deleteOne({ _id: otpRecord._id });
                                    return res.status(429).json({
                                                success: false,
                                                message: "Too many failed attempts. Please request a new OTP."
                                    });
                        }

                        // check match
                        if (otpRecord.otp !== otp) {
                                    otpRecord.attempts += 1;
                                    await otpRecord.save();
                                    return res.status(400).json({
                                                success: false,
                                                message: `Incorrect OTP. ${MAX_VERIFY_ATTEMPTS - otpRecord.attempts} attempt(s) remaining.`
                                    });
                        }

                        // correct — invalidate instantly so it cannot be used again
                        otpRecord.isUsed = true;
                        await otpRecord.save();

                        // generate secure single-use 10-minute token proving verification passed
                        const resetToken = jwt.sign(
                                    { email },
                                    process.env.JWT_SECRET,
                                    { expiresIn: '10m' }
                        );

                        return res.status(200).json({
                                    success: true,
                                    message: "OTP verified successfully. You can now reset your password",
                                    resetToken
                        });

            } catch (error) {
                        next(error);
            }
};

// POST /api/auth/reset-password
export const resetPassword = async (req, res, next) => {
            try {
                        const { resetToken, newPassword, confirmPassword } = req.body;

                        // check if resetToken exists
                        if (!resetToken) {
                                    return res.status(400).json({
                                                success: false,
                                                message: "Reset token missing. Please verify your OTP again"
                                    });
                        }

                        if (newPassword !== confirmPassword) {
                                    return res.status(400).json({
                                                success: false,
                                                message: "Passwords do not match"
                                    });
                        }

                        // validate token signature and decrypt payload
                        let decoded;
                        try {
                                    decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
                        } catch (err) {
                                    return res.status(401).json({
                                                success: false,
                                                message: "Your reset session has expired. Please request a new OTP"
                                    });
                        }

                        const { email } = decoded;

                        // find user
                        const user = await User.findOne({ email });
                        if (!user) {
                                    return res.status(404).json({
                                                success: false,
                                                message: "User not found"
                                    });
                        }

                        // check if new password is same as old password
                        const isSamePassword = await bcrypt.compare(newPassword, user.password);
                        if (isSamePassword) {
                                    return res.status(400).json({
                                                success: false,
                                                message: "New password cannot be the same as your old password"
                                    });
                        }

                        // update password — pre save hook handles hashing
                        user.password = newPassword;
                        await user.save();

                        // cleanup
                        await OTP.deleteMany({ email, purpose: 'password_reset' });

                        return res.status(200).json({
                                    success: true,
                                    message: "Password reset successfully. You can now login with your new password"
                        });

            } catch (error) {
                        next(error);
            }
};

// RESEND OTP (password reset)
// POST /api/auth/resend-otp
export const resendOTP = async (req, res, next) => {
            try {
                        const { email } = req.body;

                        // check if user exists
                        const user = await User.findOne({ email });
                        if (!user) {
                                    return res.status(200).json({
                                                success: true,
                                                message: "If this email exists, an OTP has been sent to it"
                                    });
                        }

                        // check if there is an existing OTP that was sent less than 1 minute ago
                        const recentOTP = await OTP.findOne({
                                    email,
                                    purpose: 'password_reset',
                                    createdAt: { $gte: new Date(Date.now() - RESEND_COOLDOWN_MS) }
                        });

                        if (recentOTP) {
                                    return res.status(400).json({
                                                success: false,
                                                message: "Please wait 1 minute before requesting a new OTP"
                                    });
                        }

                        // delete existing unused OTPs
                        await OTP.deleteMany({ email, isUsed: false, purpose: 'password_reset' });

                        // generate new OTP
                        const otp = generateSixDigitOtp();
                        const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

                        // save new OTP
                        await OTP.create({
                                    email,
                                    otp,
                                    purpose: 'password_reset',
                                    expiresAt
                        });

                        // send email
                        await sendEmail({
                                    to: email,
                                    subject: 'Password Reset OTP — Resend',
                                    html: otpEmailTemplate(user.name, otp)
                        });

                        return res.status(200).json({
                                    success: true,
                                    message: "A new OTP has been sent to your email"
                        });

            } catch (error) {
                        next(error);
            }
};
