// XP LOG MODEL
// Records every individual XP-earning event with a timestamp, so we can
// calculate totals for specific time windows (this week, today, etc.)
// rather than only ever having a single lifetime running total.
import mongoose from 'mongoose';

const xpLogSchema = new mongoose.Schema({
            userId: {
                        type: mongoose.Schema.Types.ObjectId,
                        ref: 'User',
                        required: true
            },
            amount: {
                        type: Number,
                        required: true
            },
            source: {
                        type: String,
                        enum: ['lesson_complete'], // extend this as more XP sources are added
                        required: true
            },
            lessonId: {
                        type: mongoose.Schema.Types.ObjectId,
                        ref: 'Lesson'
            }
}, { timestamps: true }); // createdAt is what we use for weekly calculations

const XpLog = mongoose.model('XpLog', xpLogSchema);
export default XpLog;