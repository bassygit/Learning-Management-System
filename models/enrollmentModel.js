import mongoose from 'mongoose';

const enrollmentSchema = new mongoose.Schema({
            studentId: {
                        type: mongoose.Schema.Types.ObjectId,
                        ref: 'User',
                        required: true,
                        unique: true
            },
            courseId: {
                        type: mongoose.Schema.Types.ObjectId,
                        ref: 'Course',
                        required: true
            },
            completedLessonsId: [{
                        type: mongoose.Schema.Types.ObjectId,
                        ref: 'Lesson'
            }],
            progress: {
                        type: Number,
                        default: 0,
                        min: 0,
                        max: 100 // percentage
            },
            isCompleted: {
                        type: Boolean,
                        default: false
            },
            completedAt: {
                        type: Date
            },
            paymentRef: {
                        type: String
            }
}, { timestamps: true });

const Enrollment = mongoose.model('Enrollment', enrollmentSchema);
export default Enrollment;