import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema({
            reportedBy: {
                        type: mongoose.Schema.Types.ObjectId,
                        ref: 'User',
                        required: true
            },
            contentType: {
                        type: String,
                        enum: ['course', 'lesson', 'quiz', 'user'],
                        required: true
            },
            contentId: {
                        type: mongoose.Schema.Types.ObjectId,
                        required: true
            },
            reason: {
                        type: String,
                        enum: [
                                    'inappropriate content',
                                    'spam',
                                    'plagiarism',
                                    'misleading information',
                                    'hate speech',
                                    'other'
                        ],
                        required: true
            },
            description: {
                        type: String,
                        required: true
            },
            status: {
                        type: String,
                        enum: ['pending', 'reviewed', 'resolved', 'dismissed'],
                        default: 'pending'
            },
            reviewedBy: {
                        type: mongoose.Schema.Types.ObjectId,
                        ref: 'User'  // admin who reviewed it
            },
            reviewNote: {
                        type: String  // admin's note after reviewing
            },
            reviewedAt: {
                        type: Date
            }
}, { timestamps: true });

const Report = mongoose.model('Report', reportSchema);
export default Report;