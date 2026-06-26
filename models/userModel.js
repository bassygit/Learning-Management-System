import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
            name: {
                        type: String,
                        required: true,
                        trim: true
            },
            email: {
                        type: String,
                        required: true,
                        unique: true,
                        lowercase: true
            },
            password: {
                        type: String,
                        required: true,
                        minlength: 6
            },
            role: {
                        type: String,
                        enum: ['student', 'instructor', 'admin'],
                        default: 'student'
            },
            avatar: {
                        type: String
            },
            isActive: {
                        type: Boolean,
                        default: true
            },
            enrolledCoursesId: [{
                        type: mongoose.Schema.Types.ObjectId,
                        ref: 'Course'
            }],
            completedLessonsId: [{
                        type: mongoose.Schema.Types.ObjectId,
                        ref: 'Lesson'
            }],
            certificatesId: [{
                        type: mongoose.Schema.Types.ObjectId,
                        ref: 'Certificate'
            }]
}, { timestamps: true });

userSchema.pre('save', async function () {
            if (!this.isModified('password')) return;
            this.password = await bcrypt.hash(this.password, 12);
});

const User = mongoose.model('User', userSchema);
export default User;