import mongoose from 'mongoose';

const instructorProfileSchema = new mongoose.Schema({
            user: {
                        type: mongoose.Schema.Types.ObjectId,
                        ref: 'User',
                        required: true,
                        unique: true
            },
            bio: {
                        type: String,
                        trim: true
            },
            expertise: [{
                        type: String
            }],
            socialLinks: {
                        website: { type: String },
                        linkedin: { type: String },
                        twitter: { type: String }
            },
            totalStudents: {
                        type: Number,
                        default: 0
            },
            totalCourses: {
                        type: Number,
                        default: 0
            },
            totalRevenue: {
                        type: Number,
                        default: 0
            },
            isVerified: {
                        type: Boolean,
                        default: false
            }
}, { timestamps: true });

const InstructorProfile = mongoose.model('InstructorProfile', instructorProfileSchema);
export default InstructorProfile;