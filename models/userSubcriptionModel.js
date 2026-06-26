import mongoose from 'mongoose';

const userSubscriptionSchema = new mongoose.Schema({
            user: {
                        type: mongoose.Schema.Types.ObjectId,
                        ref: 'User',
                        required: true
            },
            plan: {
                        type: mongoose.Schema.Types.ObjectId,
                        ref: 'SubscriptionPlan',
                        required: true
            },
            status: {
                        type: String,
                        enum: ['active', 'expired', 'cancelled'],
                        default: 'active'
            },
            startDate: {
                        type: Date,
                        default: Date.now
            },
            endDate: {
                        type: Date,
                        required: true  // calculated from plan duration
            },
            paymentRef: {
                        type: String,
                        required: true
            },
            amount: {
                        type: Number,
                        required: true
            },
            autoRenew: {
                        type: Boolean,
                        default: false
            }
}, { timestamps: true });

const UserSubscription = mongoose.model('UserSubscription', userSubscriptionSchema);
export default UserSubscription;