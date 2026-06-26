import mongoose from 'mongoose';

const instructorApplicationSchema = new mongoose.Schema({
            user: {
                        type: mongoose.Schema.Types.ObjectId,
                        ref: 'User',
                        required: true,
                        unique: true  // one application per user at a time
            },
            motivation: {
                        type: String,
                        required: true
            },
            expertise: [{
                        type: String,
                        required: true
            }],
            experience: {
                        type: String,
                        required: true
            },
            portfolioLinks: [{
                        type: String
            }],
            qualifications: {
                        type: String
            },
            status: {
                        type: String,
                        enum: ['pending', 'approved', 'rejected'],
                        default: 'pending'
            },
            reviewedBy: {
                        type: mongoose.Schema.Types.ObjectId,
                        ref: 'User'
            },
            rejectionReason: {
                        type: String
            },
            reviewedAt: {
                        type: Date
            }
}, { timestamps: true });

const InstructorApplication = mongoose.model('InstructorApplication', instructorApplicationSchema);

export default InstructorApplication;