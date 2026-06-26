import Joi from 'joi';

// update user role
export const updateUserRoleSchema = Joi.object({
            role: Joi.string()
                        .valid('student', 'instructor', 'admin')
                        .required()
                        .messages({
                                    'any.only': 'Role must be one of: student, instructor, admin',
                                    'any.required': 'Role is required'
                        }),
});

// update user status
export const updateUserStatusSchema = Joi.object({
            isActive: Joi.boolean()
                        .required()
                        .messages({
                                    'boolean.base': 'isActive must be a boolean',
                                    'any.required': 'isActive is required'
                        }),
});

// verify instructor
export const verifyInstructorSchema = Joi.object({
            isVerified: Joi.boolean()
                        .required()
                        .messages({
                                    'boolean.base': 'isVerified must be a boolean',
                                    'any.required': 'isVerified is required'
                        }),
});

// moderate course
export const moderateCourseSchema = Joi.object({
            isPublished: Joi.boolean()
                        .required()
                        .messages({
                                    'boolean.base': 'isPublished must be a boolean',
                                    'any.required': 'isPublished is required'
                        }),
            moderationNote: Joi.string()
                        .messages({
                                    'string.base': 'Moderation note must be a string'
                        }),
});

// submit a report — used by students and instructors
export const submitReportSchema = Joi.object({
            contentType: Joi.string()
                        .valid('course', 'lesson', 'quiz', 'user')
                        .required()
                        .messages({
                                    'any.only': 'Content type must be one of: course, lesson, quiz, user',
                                    'any.required': 'Content type is required'
                        }),
            contentId: Joi.string()
                        .required()
                        .messages({
                                    'string.empty': 'Content ID is required',
                                    'any.required': 'Content ID is required'
                        }),
            reason: Joi.string()
                        .valid(
                                    'inappropriate content',
                                    'spam',
                                    'plagiarism',
                                    'misleading information',
                                    'hate speech',
                                    'other'
                        )
                        .required()
                        .messages({
                                    'any.only': 'Reason must be one of the valid options',
                                    'any.required': 'Reason is required'
                        }),
            description: Joi.string()
                        .required()
                        .messages({
                                    'string.empty': 'Description is required',
                                    'any.required': 'Description is required'
                        }),
});

// review a report — used by admin
export const reviewReportSchema = Joi.object({
            status: Joi.string()
                        .valid('reviewed', 'resolved', 'dismissed')
                        .required()
                        .messages({
                                    'any.only': 'Status must be one of: reviewed, resolved, dismissed',
                                    'any.required': 'Status is required'
                        }),
            reviewNote: Joi.string()
                        .required()
                        .messages({
                                    'string.empty': 'Review note is required',
                                    'any.required': 'Review note is required'
                        }),
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