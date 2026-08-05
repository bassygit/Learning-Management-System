import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

await mongoose.connect(process.env.MONGO_URI);
await mongoose.connection.collection('enrollments').dropIndex('studentId_1');
console.log('Old index dropped successfully');
await mongoose.disconnect();