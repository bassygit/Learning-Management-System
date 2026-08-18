// migrations/backfillUserFields.js
//
// Run once, after deploying the updated userModel.js, to give existing
// user documents the new fields. Safe to run multiple times — it only
// touches documents where the field is missing.
//
// Usage:  node migrations/backfillUserFields.js

// import 'dotenv/config';
// import mongoose from 'mongoose';
// import User from '../models/userModel.js';

// const run = async () => {
//             await mongoose.connect(process.env.MONGO_URI);

//             const result = await User.updateMany(
//                         { purchasedCourses: { $exists: false } },
//                         { $set: { purchasedCourses: [] } }
//             );
//             console.log(`purchasedCourses backfilled on ${result.modifiedCount} users`);

//             // activeSubscription is a single ObjectId, not an array — we just
//             // leave it unset (undefined) for users with no subscription, since
//             // your code already checks `if (user.activeSubscription)` which
//             // handles undefined fine. No backfill needed for that one.

//             await mongoose.disconnect();
//             console.log('Done.');
// };

// run().catch((err) => {
//             console.error('Migration failed:', err);
//             process.exit(1);
// });



// import 'dotenv/config';
// import mongoose from 'mongoose';
// import User from '../models/userModel.js';

// const run = async () => {
//             await mongoose.connect(process.env.MONGO_URI);

//             const xpResult = await User.updateMany(
//                         { xp: { $exists: false } },
//                         { $set: { xp: 0 } }
//             );
//             console.log(`xp backfilled on ${xpResult.modifiedCount} users`);

//             await mongoose.disconnect();
//             console.log('Done.');
// };

// run().catch((err) => {
//             console.error('Migration failed:', err);
//             process.exit(1);
// });


// migrations/backfillStreakFields.js
//
// Run once, after deploying the updated userModel.js, to give existing
// user documents the streak fields. Safe to run multiple times — it
// only touches documents where currentStreak is missing.
//
// Usage:  node migrations/backfillStreakFields.js

// import 'dotenv/config';
// import mongoose from 'mongoose';
// import User from '../models/userModel.js';

// const run = async () => {
//             await mongoose.connect(process.env.MONGO_URI);

//             const result = await User.updateMany(
//                         { currentStreak: { $exists: false } },
//                         {
//                                     $set: {
//                                                 currentStreak: 0,
//                                                 longestStreak: 0,
//                                                 lastActiveDate: null
//                                     }
//                         }
//             );
//             console.log(`currentStreak / longestStreak / lastActiveDate backfilled on ${result.modifiedCount} users`);

//             await mongoose.disconnect();
//             console.log('Done.');
// };

// run().catch((err) => {
//             console.error('Migration failed:', err);
//             process.exit(1);
// });



// import 'dotenv/config';
// import mongoose from 'mongoose';
// import User from '../models/userModel.js';

// const run = async () => {
//             await mongoose.connect(process.env.MONGO_URI);

//             const result = await User.updateMany(
//                         { streakDates: { $exists: false } },
//                         { $set: { streakDates: [] } }
//             );
//             console.log(`streakDates backfilled on ${result.modifiedCount} users`);

//             await mongoose.disconnect();
//             console.log('Done.');
// };

// run().catch((err) => {
//             console.error('Migration failed:', err);
//             process.exit(1);
// });



// import 'dotenv/config';
// import mongoose from 'mongoose';
// import User from '../models/userModel.js';

// const run = async () => {
//             await mongoose.connect(process.env.MONGO_URI);

//             const result = await User.updateMany(
//                         { isVerified: { $exists: false } },
//                         { $set: { isVerified: true } }
//             );

//             console.log(`Updated ${result.modifiedCount} existing users to isVerified: true`);
//             await mongoose.disconnect();
// };

// run();


// migrations/backfillStreakDates.js
//
// Run once, after deploying the updated userModel.js, to give existing
// user documents the streakDates field. Safe to run multiple times —
// it only touches documents where streakDates is missing.
//
// Usage:  node migrations/backfillStreakDates.js

import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/userModel.js';

const run = async () => {
            await mongoose.connect(process.env.MONGO_URI);

            const result = await User.updateMany(
                        { streakDates: { $exists: false } },
                        { $set: { streakDates: [] } }
            );
            console.log(`streakDates backfilled on ${result.modifiedCount} users`);

            await mongoose.disconnect();
            console.log('Done.');
};

run().catch((err) => {
            console.error('Migration failed:', err);
            process.exit(1);
});