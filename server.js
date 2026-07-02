import express from 'express';
import cookieParser from 'cookie-parser';
import paymentRoutes from './routes/paymentRoute.js';
import dotenv from 'dotenv';
import cors from 'cors';
import ConnectDb from './config/db.js';
import studentRoutes from './routes/studentRoute.js';
import instructorRoutes from './routes/instructorRoute.js';
import adminRoutes from './routes/adminRoute.js';
import errorHandler from './middlewares/errorMiddleware.js';
import authRoutes from './routes/authRoute.js';
import instructorApplicationRoutes from './routes/instructorApplicationRoute.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
ConnectDb();

app.use('/api/payment/webhook',
            express.raw({ type: 'application/json' }),
            (req, res, next) => {
                        req.body = JSON.parse(req.body);
                        next();
            }
);

app.use(express.json());
const allowedOrigins = [
            "http://localhost:5173",
            "http://localhost:3001",
            // "http://localhost:3002",


];

app.use(
            cors({
                        origin: function (origin, callback) {
                                    if (!origin || allowedOrigins.includes(origin)) {
                                                callback(null, true);
                                    } else {
                                                callback(new Error("Not allowed by CORS: " + origin));
                                    }
                        },
                        methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
                        allowedHeaders: ["Content-Type", "Authorization"],
                        credentials: true,
            })
);



app.use(cookieParser());

// ROUTES
app.use('/auth', authRoutes);
app.use('/student', studentRoutes);
app.use('/instructor', instructorRoutes);
app.use('/admin', adminRoutes);
app.use('/payment', paymentRoutes); // Quick bugfix: Added missing leading slash here
app.use('/instructorapplication', instructorApplicationRoutes);
app.use(errorHandler);

app.get('/', (req, res) => {
            res.json({ message: 'WELCOME TO VERCITY' });
});

app.listen(PORT, () => {
            console.log(`server is running on PORT ${PORT}`);
});
