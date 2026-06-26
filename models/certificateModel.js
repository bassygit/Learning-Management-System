import mongoose from 'mongoose';

const certificateSchema = new mongoose.Schema({
            studentId: {
                        type: mongoose.Schema.Types.ObjectId,
                        ref: 'User',
                        required: true
            },
            courseId: {
                        type: mongoose.Schema.Types.ObjectId,
                        ref: 'Course',
                        required: true
            },
            enrollmentId: {
                        type: mongoose.Schema.Types.ObjectId,
                        ref: 'Enrollment',
                        required: true
            },
            certificateId: {
                        type: String,
                        unique: true,
                        required: true
            },
            issuedAt: {
                        type: Date,
                        default: Date.now
            }
}, { timestamps: true });

const Certificate = mongoose.model('Certificate', certificateSchema);
export default Certificate;