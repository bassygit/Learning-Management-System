import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema({
            email: {
                        type: String,
                        required: true
            },
            otp: {
                        type: String,
                        required: true
            },
            purpose: {
                        type: String,
                        enum: ['password_reset', 'email_verification'],
                        default: 'password_reset'
            },
            isUsed: {
                        type: Boolean,
                        default: false
            },
            expiresAt: {
                        type: Date,
                        required: true
            }
}, { timestamps: true });

// auto delete OTP after it expires
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const OTP = mongoose.model('OTP', otpSchema);
export default OTP;