// ENROLLMENT MODEL

import mongoose from 'mongoose';

const enrollmentSchema = new mongoose.Schema({
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
            completedLessonsId: [{
                        type: mongoose.Schema.Types.ObjectId,
                        ref: 'Lesson',
                        default: []
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

enrollmentSchema.index({ studentId: 1, courseId: 1 }, { unique: true });

const Enrollment = mongoose.model('Enrollment', enrollmentSchema);
export default Enrollment;


//COURSE MODEL
import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema({
            title: {
                        type: String,
                        required: true,
                        trim: true
            },
            description: {
                        type: String,
                        required: true
            },
            instructorId: {
                        type: mongoose.Schema.Types.ObjectId,
                        ref: 'User',
                        required: true
            },
            thumbnail: {
                        type: String
            },
            category: {
                        type: String,
                        required: true,
                        enum: ['Web Development', 'Product Design', 'Data Analysis', 'Product Management', 'Digital Marketing', 'Mobile Development', 'Game Development', 'Enterprenueship']
            },
            level: {
                        type: String,
                        enum: ['beginner', 'intermediate', 'advanced'],
                        default: 'beginner'
            },
            price: {
                        type: Number,
                        required: true,
                        min: 0
            },
            moderationNote: {
                        type: String
            },
            lessonsId: [{
                        type: mongoose.Schema.Types.ObjectId,
                        ref: 'Lesson'
            }],
            enrolledStudentsId: [{
                        type: mongoose.Schema.Types.ObjectId,
                        ref: 'User'
            }],
            isPublished: {
                        type: Boolean,
                        default: false
            },
            ratings: {
                        average: { type: Number, default: 0 },
                        count: { type: Number, default: 0 }
            }
}, { timestamps: true });

const Course = mongoose.model('Course', courseSchema);
export default Course;