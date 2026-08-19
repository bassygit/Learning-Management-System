import mongoose from 'mongoose';

const userBadgeSchema = new mongoose.Schema({
            userId: {
                        type: mongoose.Schema.Types.ObjectId,
                        ref: 'User',
                        required: true
            },
            badgeCode: {
                        type: String,
                        required: true
            }
}, { timestamps: true }); // createdAt = earnedAt

// a user can only earn each specific badge once
userBadgeSchema.index({ userId: 1, badgeCode: 1 }, { unique: true });

const UserBadge = mongoose.model('UserBadge', userBadgeSchema);
export default UserBadge;