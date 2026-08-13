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
            purchasedCourses: [{
                        type: mongoose.Schema.Types.ObjectId,
                        ref: 'Course'
            }],
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
            }],
            activeSubscription: {
                        type: mongoose.Schema.Types.ObjectId,
                        ref: 'UserSubscription'
            },
            xp: {
                        type: Number,
                        default: 0,
                        min: 0
            },
            currentStreak: {
                        type: Number,
                        default: 0,
                        min: 0
            },
            longestStreak: {
                        type: Number,
                        default: 0,
                        min: 0
            },
            // the last calendar date (midnight-normalized) this user was
            // credited with streak activity — used to detect same-day /
            // consecutive-day / missed-day logins
            lastActiveDate: {
                        type: Date
            }
}, { timestamps: true });

userSchema.pre('save', async function () {
            if (!this.isModified('password')) return;
            this.password = await bcrypt.hash(this.password, 12);
});

const User = mongoose.model('User', userSchema);
export default User;