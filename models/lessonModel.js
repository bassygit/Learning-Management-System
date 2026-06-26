import mongoose from 'mongoose';

const lessonSchema = new mongoose.Schema({
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
            videoUrl: {
                        type: String,
                        required: true
            },
            duration: {
                        type: Number, // duration in minutes
                        required: true
            },
            resources: [{
                        title: { type: String, required: true },
                        fileUrl: { type: String, required: true },
                        fileType: {
                                    type: String,
                                    enum: ['pdf', 'doc']
                        }
            }],
            order: {
                        type: Number, // position of lesson in course
                        required: true
            },
            isPreview: {
                        type: Boolean,
                        default: false // free preview before enrollment
            }
}, { timestamps: true });

const Lesson = mongoose.model('Lesson', lessonSchema);
export default Lesson;