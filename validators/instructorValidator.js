import Joi from 'joi';

// create course
export const createCourseSchema = Joi.object({
            title: Joi.string().trim().required().messages({
                        'string.empty': 'Course title is required',
                        'any.required': 'Course title is required'
            }),
            description: Joi.string().required().messages({
                        'string.empty': 'Description is required',
                        'any.required': 'Description is required'
            }),
            category: Joi.string()
                        .valid('Web development', 'Product Design', 'Data Analysis', 'Product Management', 'Digital Marketing', 'Mobile Development', 'Game Development', 'Enterprenueship')
                        .required()
                        .messages({
                                    'any.only': 'Category must be one of: Web development, Product Design, Data Analysis, Product Management, Digital Marketing, Mobile Development,Game Development,Enterprenueship',
                                    'any.required': 'Category is required'
                        }),
            level: Joi.string()
                        .valid('beginner', 'intermediate', 'advanced')
                        .default('beginner')
                        .messages({
                                    'any.only': 'Level must be one of: beginner, intermediate, advanced'
                        }),
            price: Joi.number().min(0).required().messages({
                        'number.min': 'Price cannot be negative',
                        'any.required': 'Price is required'
            }),
            thumbnail: Joi.string().messages({
                        'string.base': 'Thumbnail must be a URL string'
            }),
            instructorId: Joi.string().valid().required()
});

// update course
export const updateCourseSchema = Joi.object({
            title: Joi.string().trim().messages({
                        'string.empty': 'Course title cannot be empty'
            }),
            description: Joi.string().messages({
                        'string.empty': 'Description cannot be empty'
            }),
            category: Joi.string()
                        .valid('Web development', 'Product Design', 'Data Analysis', 'Product Management', 'Digital Marketing', 'Mobile Development', 'Game Development', 'Enterprenueship')
                        .messages({
                                    'any.only': 'Category must be one of: Web development, Product Design, Data Analysis, Product Management, Digital Marketing, Mobile Development,Game Development,Enterprenueship'
                        }),
            level: Joi.string()
                        .valid('beginner', 'intermediate', 'advanced')
                        .messages({
                                    'any.only': 'Level must be one of: beginner, intermediate, advanced'
                        }),
            price: Joi.number().min(0).messages({
                        'number.min': 'Price cannot be negative'
            }),
            thumbnail: Joi.string().messages({
                        'string.base': 'Thumbnail must be a URL string'
            }),
});

// create lesson
export const createLessonSchema = Joi.object({
            title: Joi.string().trim().required().messages({
                        'string.empty': 'Lesson title is required',
                        'any.required': 'Lesson title is required'
            }),
            video: Joi.string().required().messages({
                        'string.empty': 'Video URL is required',
                        'any.required': 'Video URL is required'
            }),
            duration: Joi.number().required().messages({
                        'number.base': 'Duration must be a number',
                        'any.required': 'Duration is required'
            }),
            order: Joi.number().required().messages({
                        'number.base': 'Order must be a number',
                        'any.required': 'Order is required'
            }),
            isPreview: Joi.boolean().default(false)
});

// update lesson
export const updateLessonSchema = Joi.object({
            title: Joi.string().trim().messages({
                        'string.empty': 'Lesson title cannot be empty'
            }),
            videoUrl: Joi.string().messages({
                        'string.empty': 'Video URL cannot be empty'
            }),
            duration: Joi.number().messages({
                        'number.base': 'Duration must be a number'
            }),
            order: Joi.number().messages({
                        'number.base': 'Order must be a number'
            }),
            isPreview: Joi.boolean(),
            resources: Joi.array().items(
                        Joi.object({
                                    title: Joi.string().required(),
                                    fileUrl: Joi.string().required(),
                                    fileType: Joi.string().valid('pdf', 'doc', 'zip', 'ppt', 'xls')
                        })
            )
});


export const uploadLessonResourceSchema = Joi.array().items(
            Joi.object({
                        title: Joi.string().required().messages({
                                    'string.empty': 'title is required',
                                    'any.required': 'title is required'
                        }),
                        fileUrl: Joi.string().required().messages({
                                    'string.empty': 'fileUrl is required',
                                    'any.required': 'fileUrl is required'
                        }),
                        fileType: Joi.string().valid('pdf', 'doc').messages({
                                    'string.empty': 'fileType must be of pdf or doc',
                                    'any.only': 'fileType must be pdf or doc',
                                    'any.required': 'fileUrl is required',
                        })
            })
)

// create quiz
export const createQuizSchema = Joi.object({
            title: Joi.string().trim().required().messages({
                        'string.empty': 'Quiz title is required',
                        'any.required': 'Quiz title is required'
            }),
            lessonId: Joi.string().messages({
                        'string.base': 'Lesson ID must be a string'
            }),
            questions: Joi.array().items(
                        Joi.object({
                                    question: Joi.string().required().messages({
                                                'any.required': 'Question text is required'
                                    }),
                                    options: Joi.array()
                                                .items(Joi.string())
                                                .min(2)
                                                .required()
                                                .messages({
                                                            'array.min': 'At least 2 options are required',
                                                            'any.required': 'Options are required'
                                                }),
                                    correctAnswer: Joi.number().required().messages({
                                                'any.required': 'Correct answer index is required'
                                    }),
                                    explanation: Joi.string()
                        })
            ).min(1).required().messages({
                        'array.min': 'At least 1 question is required',
                        'any.required': 'Questions are required'
            }),
            passingScore: Joi.number().min(0).max(100).default(70).messages({
                        'number.min': 'Passing score cannot be less than 0',
                        'number.max': 'Passing score cannot be more than 100'
            }),
            timeLimit: Joi.number().default(30).messages({
                        'number.base': 'Time limit must be a number'
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