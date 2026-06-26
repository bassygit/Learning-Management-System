import Joi from 'joi';

// enroll in a course
export const enrollCourseSchema = Joi.object({
            courseId: Joi.string().required().messages({
                        'string.empty': 'Course ID is required',
                        'any.required': 'Course ID is required'
            }),
});

// mark lesson as complete
export const completeLessonSchema = Joi.object({
            lessonId: Joi.string().required().messages({
                        'string.empty': 'Lesson ID is required',
                        'any.required': 'Lesson ID is required'
            }),
});

// submit quiz
export const submitQuizSchema = Joi.object({
            answers: Joi.array()
                        .items(Joi.object({
                                    questionIndex: Joi.number().required().messages({
                                                'any.required': 'Question index is required'
                                    }),
                                    selectedAnswer: Joi.number().required().messages({
                                                'any.required': 'Selected answer is required'
                                    })
                        }))
                        .required()
                        .messages({
                                    'any.required': 'Answers are required'
                        }),
            timeTaken: Joi.number().messages({
                        'number.base': 'Time taken must be a number'
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