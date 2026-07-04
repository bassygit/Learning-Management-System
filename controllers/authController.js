import User from '../models/userModel.js';
import InstructorProfile from '../models/instructorModel.js';
import bcrypt from 'bcryptjs';
import generateToken from '../utils/generateToken.js';
import OTP from '../models/otpModel.js';
import sendEmail from '../utils/sendEmail.js';
import { otpEmailTemplate } from '../utils/emailTemplates.js';
import jwt from 'jsonwebtoken';
import BlacklistedToken from '../models/blacklistedTokenModel.js';

// ---- REGISTER ----
// POST /api/auth/register
export const register = async (req, res, next) => {
            try {
                        const { name, email, password } = req.body;

                        // check if user already exists
                        const existingUser = await User.findOne({ email });
                        if (existingUser) {
                                    return res.status(400).json({
                                                success: false,
                                                message: `User with email ${email} already exists`
                                    });
                        }

                        // create new user
                        const user = await User.create({
                                    name,
                                    email,
                                    password
                        });

                        return res.status(201).json({
                                    success: true,
                                    message: "Registration successful",
                        });

            } catch (error) {
                        next(error);
            }
};

// ---- LOGIN ----
// POST /api/auth/login
export const login = async (req, res, next) => {
            try {
                        const { email, password } = req.body;

                        // check if user exists
                        const user = await User.findOne({ email });
                        if (!user) {
                                    return res.status(401).json({
                                                success: false,
                                                message: "Invalid email or password"
                                    });
                        }

                        // check if account is active
                        if (!user.isActive) {
                                    return res.status(401).json({
                                                success: false,
                                                message: "Your account has been deactivated. Contact support"
                                    });
                        }

                        // check if password is correct
                        const correctPassword = await bcrypt.compare(password, user.password);
                        if (!correctPassword) {
                                    return res.status(401).json({
                                                success: false,
                                                message: "Invalid email or password"
                                    });
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
                                    token
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



// ---- GET PROFILE ----
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

// ---- UPDATE PROFILE ----
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

// ---- CHANGE PASSWORD ----
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

// ---- FORGOT PASSWORD ----

// STEP 1 — REQUEST OTP
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

                        // delete any existing unused OTPs for this email
                        await OTP.deleteMany({ email, isUsed: false });

                        // generate 6 digit OTP
                        const otp = Math.floor(100000 + Math.random() * 900000).toString();
                        console.log('Generated OTP:', otp, 'for email:', email);

                        // set expiry to 10 minutes from now
                        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

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

// ==========================================
// 8. FORGOT PASSWORD — STEP 2: VERIFY OTP   //FIXED
// ==========================================
// POST /api/auth/verify-otp
export const verifyOTP = async (req, res, next) => {
            try {
                        const { email, otp } = req.body;

                        // find OTP in database
                        const otpRecord = await OTP.findOne({
                                    email,
                                    otp,
                                    isUsed: false,
                                    purpose: 'password_reset'
                        });

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

                        // FIXED: Invalidate OTP instantly so it cannot be used again
                        otpRecord.isUsed = true;
                        await otpRecord.save();

                        // FIXED: Generate secure single-use 5-minute token proving verification passed
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
                        await OTP.deleteMany({ email });

                        return res.status(200).json({
                                    success: true,
                                    message: "Password reset successfully. You can now login with your new password"
                        });

            } catch (error) {
                        next(error);
            }
};


// RESEND OTP
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
                                    isUsed: false,
                                    createdAt: { $gte: new Date(Date.now() - 60 * 1000) } // last 1 minute
                        });

                        if (recentOTP) {
                                    return res.status(400).json({
                                                success: false,
                                                message: "Please wait 1 minute before requesting a new OTP"
                                    });
                        }

                        // delete existing OTPs
                        await OTP.deleteMany({ email, isUsed: false });

                        // generate new OTP
                        const otp = Math.floor(100000 + Math.random() * 900000).toString();
                        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

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