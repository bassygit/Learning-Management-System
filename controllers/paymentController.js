import axios from 'axios';
import crypto from 'crypto';
import Course from '../models/courseModel.js';
import Payment from '../models/paymentModel.js';
import Enrollment from '../models/enrollmentModel.js';
import User from '../models/userModel.js';
import SubscriptionPlan from '../models/subcriptionModel.js';
import UserSubscription from '../models/userSubcriptionModel.js';

// ---- HELPER FUNCTIONS ----

// generate unique payment reference
const generatePaymentRef = () => {
            const timestamp = Date.now();
            const random = crypto.randomBytes(4).toString('hex').toUpperCase();
            return `LMS-${timestamp}-${random}`;
};

// generate invoice number
const generateInvoiceNumber = () => {
            const timestamp = Date.now();
            const random = Math.floor(Math.random() * 1000);
            return `INV-${timestamp}-${random}`;
};

// paystack axios instance
const paystackAPI = axios.create({
            baseURL: 'https://api.paystack.co',
            headers: {
                        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                        'Content-Type': 'application/json'
            }
});

// ---- 1. INITIALIZE PAYMENT ----

// POST /api/payment/initialize
export const initializePayment = async (req, res, next) => {
            try {
                        const { type, courseId, planId } = req.body;

                        // get logged in user
                        const user = await User.findById(req.user.id);

                        let amount = 0;
                        let itemName = '';
                        let paymentData = {};

                        // ---- COURSE PAYMENT ----
                        if (type === 'course') {
                                    if (!courseId) {
                                                return res.status(400).json({
                                                            success: false,
                                                            message: "Course ID is required for course payment"
                                                });
                                    }

                                    const course = await Course.findById(courseId);
                                    if (!course) {
                                                return res.status(404).json({
                                                            success: false,
                                                            message: "Course not found"
                                                });
                                    }

                                    if (!course.isPublished) {
                                                return res.status(400).json({
                                                            success: false,
                                                            message: "Course is not available"
                                                });
                                    }

                                    // check if already purchased
                                    if (user.purchasedCourses.map(id => id.toString()).includes(courseId)) {
                                                return res.status(400).json({
                                                            success: false,
                                                            message: "You have already purchased this course"
                                                });
                                    }

                                    // check if free course
                                    if (course.price === 0) {
                                                return res.status(400).json({
                                                            success: false,
                                                            message: "This is a free course, no payment needed"
                                                });
                                    }

                                    amount = course.price;
                                    itemName = course.title;
                                    paymentData.course = courseId;
                        }

                        // ---- SUBSCRIPTION PAYMENT ----
                        if (type === 'subscription') {
                                    if (!planId) {
                                                return res.status(400).json({
                                                            success: false,
                                                            message: "Plan ID is required for subscription payment"
                                                });
                                    }

                                    const plan = await SubscriptionPlan.findById(planId);
                                    if (!plan || !plan.isActive) {
                                                return res.status(404).json({
                                                            success: false,
                                                            message: "Subscription plan not found or inactive"
                                                });
                                    }

                                    // check if already has active subscription
                                    if (user.activeSubscription) {
                                                const activeSub = await UserSubscription.findById(
                                                            user.activeSubscription
                                                );
                                                if (activeSub && activeSub.status === 'active' && activeSub.endDate > new Date()) {
                                                            return res.status(400).json({
                                                                        success: false,
                                                                        message: "You already have an active subscription"
                                                            });
                                                }
                                    }

                                    amount = plan.price;
                                    itemName = `${plan.name} subscription`;
                                    paymentData.subscription = planId;
                        }

                        // generate references
                        const paymentRef = generatePaymentRef();
                        const invoiceNumber = generateInvoiceNumber();

                        // create pending payment in database
                        const payment = await Payment.create({
                                    user: req.user.id,
                                    type,
                                    ...paymentData,
                                    amount,
                                    amountInKobo: amount * 100,  // convert naira to kobo for paystack
                                    paymentRef,
                                    invoiceNumber,
                                    status: 'pending'
                        });

                        // ---- CALL PAYSTACK INITIALIZE ----
                        const paystackResponse = await paystackAPI.post(
                                    '/transaction/initialize',
                                    {
                                                email: user.email,
                                                amount: amount * 100,       // paystack always takes kobo
                                                reference: paymentRef,      // your unique reference
                                                currency: 'NGN',            // nigerian naira
                                                channels: [                 // payment channels available in nigeria
                                                            'card',
                                                            'bank',
                                                            'ussd',
                                                            'qr',
                                                            'mobile_money',
                                                            'bank_transfer'
                                                ],
                                                metadata: {
                                                            paymentId: payment._id,
                                                            userId: req.user.id,
                                                            type,
                                                            itemName,
                                                            custom_fields: [
                                                                        {
                                                                                    display_name: "Item",
                                                                                    variable_name: "item",
                                                                                    value: itemName
                                                                        },
                                                                        {
                                                                                    display_name: "Payment Type",
                                                                                    variable_name: "payment_type",
                                                                                    value: type
                                                                        }
                                                            ]
                                                },
                                                callback_url: `${process.env.CLIENT_URL}/payment/verify?reference=${paymentRef}`
                                    }
                        );

                        // save paystack reference to payment
                        payment.paystackRef = paystackResponse.data.data.reference;
                        await payment.save();

                        return res.status(200).json({
                                    success: true,
                                    message: "Payment initialized successfully",
                                    data: {
                                                authorizationUrl: paystackResponse.data.data.authorization_url, // redirect here
                                                accessCode: paystackResponse.data.data.access_code,
                                                reference: paymentRef,
                                                invoiceNumber,
                                                amount,
                                                currency: 'NGN',
                                                item: itemName
                                    }
                        });

            } catch (error) {
                        next(error);
            }
};

// ---- 2. VERIFY PAYMENT ----

// POST /api/payment/verify
export const verifyPayment = async (req, res, next) => {
            try {
                        const { reference } = req.body;

                        // find payment in database
                        const payment = await Payment.findOne({ paymentRef: reference });
                        if (!payment) {
                                    return res.status(404).json({
                                                success: false,
                                                message: "Payment record not found"
                                    });
                        }

                        // check if already verified
                        if (payment.status === 'successful') {
                                    return res.status(400).json({
                                                success: false,
                                                message: "Payment already verified"
                                    });
                        }

                        // ---- CALL PAYSTACK VERIFY ----
                        const paystackResponse = await paystackAPI.get(
                                    `/transaction/verify/${reference}`
                        );

                        const paystackData = paystackResponse.data.data;

                        // check if payment was successful on paystack
                        if (paystackData.status !== 'success') {
                                    payment.status = paystackData.status === 'abandoned'
                                                ? 'abandoned'
                                                : 'failed';
                                    await payment.save();

                                    return res.status(400).json({
                                                success: false,
                                                message: `Payment ${payment.status}. Please try again`
                                    });
                        }

                        // verify amount matches — security check
                        // paystack returns amount in kobo so divide by 100
                        if (paystackData.amount / 100 !== payment.amount) {
                                    return res.status(400).json({
                                                success: false,
                                                message: "Payment amount mismatch. Contact support"
                                    });
                        }

                        // update payment with full paystack details
                        payment.status = 'successful';
                        payment.paidAt = new Date(paystackData.paid_at);
                        payment.paystackTransactionId = paystackData.id;
                        payment.channel = paystackData.channel;
                        payment.ipAddress = paystackData.ip_address;
                        payment.paystackResponse = paystackData; // save full response

                        // save card details if paid by card
                        if (paystackData.channel === 'card' && paystackData.authorization) {
                                    payment.cardDetails = {
                                                last4: paystackData.authorization.last4,
                                                expMonth: paystackData.authorization.exp_month,
                                                expYear: paystackData.authorization.exp_year,
                                                cardType: paystackData.authorization.card_type,
                                                bank: paystackData.authorization.bank
                                    };
                        }

                        await payment.save();

                        // ---- FULFILL PAYMENT ----
                        await fulfillPayment(payment);

                        return res.status(200).json({
                                    success: true,
                                    message: "Payment verified successfully",
                                    data: {
                                                invoiceNumber: payment.invoiceNumber,
                                                amount: payment.amount,
                                                currency: payment.currency,
                                                channel: payment.channel,
                                                paidAt: payment.paidAt,
                                                type: payment.type
                                    }
                        });

            } catch (error) {
                        next(error);
            }
};

// ---- 3. PAYSTACK WEBHOOK ----

// POST /api/payment/webhook
// called automatically by paystack after payment
export const paystackWebhook = async (req, res, next) => {
            try {
                        // ---- VERIFY WEBHOOK SIGNATURE ----
                        // this makes sure the request is actually from paystack
                        // and not from someone pretending to be paystack
                        const signature = req.headers['x-paystack-signature'];
                        const hash = crypto
                                    .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
                                    .update(JSON.stringify(req.body))
                                    .digest('hex');

                        if (hash !== signature) {
                                    return res.status(401).json({
                                                success: false,
                                                message: "Invalid webhook signature"
                                    });
                        }

                        const event = req.body;
                        console.log('Paystack webhook event:', event.event);

                        // ---- HANDLE DIFFERENT EVENTS ----
                        switch (event.event) {

                                    // payment was successful
                                    case 'charge.success': {
                                                const reference = event.data.reference;

                                                // find payment by reference
                                                const payment = await Payment.findOne({ paymentRef: reference });
                                                if (!payment || payment.status === 'successful') {
                                                            return res.sendStatus(200); // already handled
                                                }

                                                // update payment status
                                                payment.status = 'successful';
                                                payment.paidAt = new Date(event.data.paid_at);
                                                payment.paystackTransactionId = event.data.id;
                                                payment.channel = event.data.channel;
                                                payment.ipAddress = event.data.ip_address;
                                                payment.paystackResponse = event.data;

                                                // save card details
                                                if (event.data.channel === 'card' && event.data.authorization) {
                                                            payment.cardDetails = {
                                                                        last4: event.data.authorization.last4,
                                                                        expMonth: event.data.authorization.exp_month,
                                                                        expYear: event.data.authorization.exp_year,
                                                                        cardType: event.data.authorization.card_type,
                                                                        bank: event.data.authorization.bank
                                                            };
                                                }

                                                await payment.save();

                                                // fulfill the payment
                                                await fulfillPayment(payment);
                                                break;
                                    }

                                    // payment failed
                                    case 'charge.failed': {
                                                const reference = event.data.reference;
                                                await Payment.findOneAndUpdate(
                                                            { paymentRef: reference },
                                                            { status: 'failed', paystackResponse: event.data }
                                                );
                                                break;
                                    }

                                    // subscription was disabled
                                    case 'subscription.disable': {
                                                await UserSubscription.findOneAndUpdate(
                                                            { paymentRef: event.data.subscription_code },
                                                            { status: 'cancelled' }
                                                );
                                                break;
                                    }

                                    default:
                                                console.log(`Unhandled webhook event: ${event.event}`);
                        }

                        // always send 200 to paystack so it knows you received the webhook
                        return res.sendStatus(200);

            } catch (error) {
                        // still send 200 to paystack even if something goes wrong
                        // otherwise paystack will keep retrying
                        console.error('Webhook error:', error);
                        return res.sendStatus(200);
            }
};

// ---- FULFILL PAYMENT HELPER ----
// called after payment is verified — both from verify and webhook
const fulfillPayment = async (payment) => {
            // ---- FULFILL COURSE PURCHASE ----
            if (payment.type === 'course') {
                        // add course to student purchased courses
                        await User.findByIdAndUpdate(payment.user, {
                                    $addToSet: { purchasedCourses: payment.course } // addToSet prevents duplicates
                        });

                        // check if already enrolled
                        const existingEnrollment = await Enrollment.findOne({
                                    student: payment.user,
                                    course: payment.course
                        });

                        if (!existingEnrollment) {
                                    // create enrollment
                                    await Enrollment.create({
                                                student: payment.user,
                                                course: payment.course,
                                                paymentRef: payment.paymentRef
                                    });

                                    // add student to course
                                    await Course.findByIdAndUpdate(payment.course, {
                                                $addToSet: { enrolledStudents: payment.user }
                                    });

                                    // add course to user enrolled courses
                                    await User.findByIdAndUpdate(payment.user, {
                                                $addToSet: { enrolledCourses: payment.course }
                                    });
                        }
            }

            // ---- FULFILL SUBSCRIPTION ----
            if (payment.type === 'subscription') {
                        const plan = await SubscriptionPlan.findById(payment.subscription);

                        // calculate end date from plan duration
                        const startDate = new Date();
                        const endDate = new Date();
                        endDate.setDate(endDate.getDate() + plan.duration);

                        // create user subscription
                        const userSubscription = await UserSubscription.create({
                                    user: payment.user,
                                    plan: payment.subscription,
                                    startDate,
                                    endDate,
                                    paymentRef: payment.paymentRef,
                                    amount: payment.amount,
                                    status: 'active'
                        });

                        // update user active subscription
                        await User.findByIdAndUpdate(payment.user, {
                                    activeSubscription: userSubscription._id
                        });
            }
};

// ---- INVOICE ----

// GET /api/payment/invoice/:reference
export const getInvoice = async (req, res, next) => {
            try {
                        const payment = await Payment.findOne({
                                    paymentRef: req.params.reference,
                                    user: req.user.id  // make sure invoice belongs to logged in user
                        })
                                    .populate('user', 'name email')
                                    .populate('course', 'title price')
                                    .populate('subscription', 'name price duration');

                        if (!payment) {
                                    return res.status(404).json({
                                                success: false,
                                                message: "Invoice not found"
                                    });
                        }

                        // build invoice
                        return res.status(200).json({
                                    success: true,
                                    data: {
                                                invoiceNumber: payment.invoiceNumber,
                                                issuedDate: payment.createdAt,
                                                paidDate: payment.paidAt,
                                                status: payment.status,
                                                issuedTo: {
                                                            name: payment.user.name,
                                                            email: payment.user.email
                                                },
                                                item: payment.type === 'course'
                                                            ? {
                                                                        type: 'Course Purchase',
                                                                        name: payment.course.title,
                                                                        price: payment.course.price
                                                            }
                                                            : {
                                                                        type: 'Subscription Plan',
                                                                        name: payment.subscription.name,
                                                                        duration: `${payment.subscription.duration} days`,
                                                                        price: payment.subscription.price
                                                            },
                                                paymentDetails: {
                                                            amount: payment.amount,
                                                            currency: payment.currency,
                                                            channel: payment.channel,
                                                            cardDetails: payment.cardDetails || null,
                                                            reference: payment.paymentRef
                                                }
                                    }
                        });

            } catch (error) {
                        next(error);
            }
};

// GET /api/payment/history
export const getPaymentHistory = async (req, res, next) => {
            try {
                        const page = parseInt(req.query.page) || 1;
                        const limit = parseInt(req.query.limit) || 10;
                        const skip = (page - 1) * limit;

                        const filter = { user: req.user.id };
                        if (req.query.status) filter.status = req.query.status;
                        if (req.query.type) filter.type = req.query.type;

                        const payments = await Payment.find(filter)
                                    .populate('course', 'title thumbnail')
                                    .populate('subscription', 'name duration')
                                    .skip(skip)
                                    .limit(limit)
                                    .sort({ createdAt: -1 });

                        const total = await Payment.countDocuments(filter);

                        return res.status(200).json({
                                    success: true,
                                    data: payments,
                                    pagination: {
                                                total,
                                                page,
                                                limit,
                                                totalPages: Math.ceil(total / limit)
                                    }
                        });

            } catch (error) {
                        next(error);
            }
};