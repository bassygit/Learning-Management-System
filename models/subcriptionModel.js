import mongoose from 'mongoose';

const subscriptionPlanSchema = new mongoose.Schema({
            name: {
                        type: String,
                        required: true,
                        enum: ['basic', 'standard', 'premium']
            },
            description: {
                        type: String,
                        required: true
            },
            price: {
                        type: Number,
                        required: true,
                        min: 0
            },
            duration: {
                        type: Number,
                        required: true  // duration in days e.g 30, 90, 365
            },
            features: [{
                        type: String  // list of features included in plan
            }],
            maxCourses: {
                        type: Number,
                        default: null  // null means unlimited
            },
            isActive: {
                        type: Boolean,
                        default: true
            }
}, { timestamps: true });

const SubscriptionPlan = mongoose.model('SubscriptionPlan', subscriptionPlanSchema);
export default SubscriptionPlan;