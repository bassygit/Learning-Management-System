import Joi from 'joi';

// initialize payment
export const initializePaymentSchema = Joi.object({
            type: Joi.string()
                        .valid('course', 'subscription')
                        .required()
                        .messages({
                                    'any.only': 'Type must be either course or subscription',
                                    'any.required': 'Payment type is required'
                        }),
            courseId: Joi.string().when('type', {
                        is: 'course',
                        then: Joi.required(),  // required if type is course
                        otherwise: Joi.optional()
            }).messages({
                        'any.required': 'Course ID is required for course payment'
            }),
            planId: Joi.string().when('type', {
                        is: 'subscription',
                        then: Joi.required(),  // required if type is subscription
                        otherwise: Joi.optional()
            }).messages({
                        'any.required': 'Plan ID is required for subscription payment'
            }),
});

// verify payment
export const verifyPaymentSchema = Joi.object({
            reference: Joi.string()
                        .required()
                        .messages({
                                    'string.empty': 'Payment reference is required',
                                    'any.required': 'Payment reference is required'
                        }),
});

const validate = (schema) => (req, res, next) => {
            const { error } = schema.validate(req.body, { abortEarly: false });
            if (error) {
                        return res.status(400).json({
                                    success: false,
                                    message: error.details.map(d => d.message)
                        });
            }
            next();
};

export default validate;