import Joi from 'joi';

// register
export const registerSchema = Joi.object({
            name: Joi.string().trim().required().messages({
                        'string.empty': 'Name is required',
                        'any.required': 'Name is required'
            }),

            email: Joi.string().email().lowercase().required().messages({
                        'string.email': 'Please provide a valid email',
                        'string.empty': 'Email is required',
                        'any.required': 'Email is required'
            }),

            password: Joi.string().min(6).required().messages({
                        'string.min': 'Password must be at least 6 characters',
                        'string.empty': 'Password is required',
                        'any.required': 'Password is required'
            }),
});

// login
export const loginSchema = Joi.object({
            email: Joi.string().email().lowercase().required().messages({
                        'string.email': 'Please provide a valid email',
                        'string.empty': 'Email is required',
                        'any.required': 'Email is required'
            }),

            password: Joi.string().required().messages({
                        'string.empty': 'Password is required',
                        'any.required': 'Password is required'
            }),
});

// update profile
export const updateProfileSchema = Joi.object({
            name: Joi.string().trim().messages({
                        'string.empty': 'Name cannot be empty'
            }),

            avatar: Joi.string().messages({
                        'string.base': 'Avatar must be a URL string'
            }),
});

// change password
export const changePasswordSchema = Joi.object({
            currentPassword: Joi.string().required().messages({
                        'string.empty': 'Current password is required',
                        'any.required': 'Current password is required'
            }),

            newPassword: Joi.string().min(6).required().messages({
                        'string.min': 'New password must be at least 6 characters',
                        'string.empty': 'New password is required',
                        'any.required': 'New password is required'
            }),
});
// forgot password — step 1 — request OTP
export const forgotPasswordSchema = Joi.object({
            email: Joi.string().email().lowercase().required().messages({
                        'string.email': 'Please provide a valid email',
                        'string.empty': 'Email is required',
                        'any.required': 'Email is required'
            }),
});

// verify OTP — step 2 — verify OTP
export const verifyOTPSchema = Joi.object({
            email: Joi.string().email().lowercase().required().messages({
                        'string.email': 'Please provide a valid email',
                        'string.empty': 'Email is required',
                        'any.required': 'Email is required'
            }),
            otp: Joi.string().length(6).required().messages({
                        'string.length': 'OTP must be 6 digits',
                        'string.empty': 'OTP is required',
                        'any.required': 'OTP is required'
            }),
});

// reset password — step 3 — set new password
export const resetPasswordSchema = Joi.object({
            resetToken: Joi.string().required().messages({
                        'string.empty': 'Reset token missing. Please verify your OTP again.',
                        'any.required': 'Reset token is required.'
            }),

            newPassword: Joi.string().min(6).max(100).required().messages({
                        'string.empty': 'Password cannot be empty.',
                        'string.min': 'Password must be at least 6 characters long.',
                        'any.required': 'Password is required.'
            })
});


//instructor
// review instructor application
// apply to become instructor
export const instructorApplicationSchema = Joi.object({
            motivation: Joi.string().required().messages({
                        'string.empty': 'Motivation is required',
                        'any.required': 'Please tell us why you want to become an instructor'
            }),

            expertise: Joi.array().items(Joi.string()).min(1).required().messages({
                        'array.min': 'Please add at least one area of expertise',
                        'any.required': 'Expertise is required'
            }),

            experience: Joi.string().required().messages({
                        'string.empty': 'Experience is required',
                        'any.required': 'Please describe your experience'
            }),

            portfolioLinks: Joi.array().items(Joi.string()).messages({
                        'array.base': 'Portfolio links must be an array'
            }),

            qualifications: Joi.string().messages({
                        'string.base': 'Qualifications must be a string'
            })
});
export const reviewApplicationSchema = Joi.object({
            status: Joi.string().valid('approved', 'rejected').required().messages({
                        'any.only': 'Status must be either approved or rejected',
                        'any.required': 'Status is required'
            }),
            rejectionReason: Joi.string()
                        .when('status', {
                                    is: 'rejected',
                                    then: Joi.required(),
                                    otherwise: Joi.optional()
                        })
                        .messages({
                                    'any.required': 'Please provide a reason for rejection'
                        })
});



const validate = (schema) => (req, res, next) => {
            const { error } = schema.validate(req.body, { abortEarly: false });
            if (error) {
                        return res.status(400).json({
                                    success: false,
                                    message: error.details.map(e => e.message)
                        });
            }
            next();
};

export default validate;