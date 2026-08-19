import UserBadge from '../models/userBadgeModel.js';

const awardBadge = async (userId, badgeCode) => {
            try {
                        await UserBadge.create({ userId, badgeCode });
                        return true; // newly awarded
            } catch (error) {
                        if (error.code === 11000) {
                                    return false; // already had it
                        }
                        // anything else is a genuine problem — log it, but don't let a
                        // badge failure break the actual request (login/lesson completion)
                        console.error('awardBadge error:', error);
                        return false;
            }
};

export default awardBadge;