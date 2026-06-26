import mongoose from 'mongoose';

const quizResultSchema = new mongoose.Schema({
            studentId: {
                        type: mongoose.Schema.Types.ObjectId,
                        ref: 'User',
                        required: true
            },
            quizId: {
                        type: mongoose.Schema.Types.ObjectId,
                        ref: 'Quiz',
                        required: true
            },
            courseId: {
                        type: mongoose.Schema.Types.ObjectId,
                        ref: 'Course',
                        required: true
            },
            answers: [{
                        questionIndex: { type: Number, required: true },
                        selectedAnswer: { type: Number, required: true }
            }],
            score: {
                        type: Number,
                        required: true
            },
            passed: {
                        type: Boolean,
                        required: true
            },
            timeTaken: {
                        type: Number // time taken in minutes
            }
}, { timestamps: true });

const QuizResult = mongoose.models.QuizResult || mongoose.model('QuizResult', quizResultSchema);

export default QuizResult;






// const QuizResult = mongoose.model('QuizResult', quizResultSchema);
// export default QuizResult;