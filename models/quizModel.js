import mongoose from 'mongoose';

const quizSchema = new mongoose.Schema({
            title: {
                        type: String,
                        required: true,
                        trim: true
            },
            courseId: {
                        type: mongoose.Schema.Types.ObjectId,
                        ref: 'Course',
                        required: true
            },
            lessonId: {
                        type: mongoose.Schema.Types.ObjectId,
                        ref: 'Lesson'
            },
            questions: [{
                        question: { type: String, required: true },
                        options: [{ type: String, required: true }],
                        correctAnswer: { type: Number, required: true }, // index of correct option
                        explanation: { type: String }
            }],
            passingScore: {
                        type: Number,
                        default: 70 // 70% to pass
            },
            timeLimit: {
                        type: Number, // time limit in minutes
                        default: 30
            }
}, { timestamps: true });

const Quiz = mongoose.model('Quiz', quizSchema);
export default Quiz;