import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
            user: {
                        type: mongoose.Schema.Types.ObjectId,
                        ref: 'User',
                        required: true
            },
            type: {
                        type: String,
                        enum: ['course', 'subscription'],
                        required: true
            },
            // for course purchase
            course: {
                        type: mongoose.Schema.Types.ObjectId,
                        ref: 'Course'
            },
            // for subscription purchase
            subscription: {
                        type: mongoose.Schema.Types.ObjectId,
                        ref: 'SubscriptionPlan'
            },
            amount: {
                        type: Number,
                        required: true  // stored in naira
            },
            amountInKobo: {
                        type: Number,
                        required: true  // stored in kobo (naira * 100)
            },
            currency: {
                        type: String,
                        default: 'NGN'  // nigerian naira
            },
            status: {
                        type: String,
                        enum: ['pending', 'successful', 'failed', 'abandoned'],
                        default: 'pending'
            },
            // your internal reference
            paymentRef: {
                        type: String,
                        unique: true,
                        required: true
            },
            // reference from paystack
            paystackRef: {
                        type: String
            },
            // paystack transaction id
            paystackTransactionId: {
                        type: Number
            },
            // invoice number for receipt
            invoiceNumber: {
                        type: String,
                        unique: true
            },
            // payment channel used by customer
            channel: {
                        type: String,
                        enum: ['card', 'bank', 'ussd', 'qr', 'mobile_money', 'bank_transfer'],
            },
            // card details snapshot — no sensitive data
            cardDetails: {
                        last4: String,
                        expMonth: String,
                        expYear: String,
                        cardType: String,   // visa, mastercard etc
                        bank: String        // gtb, access, zenith etc
            },
            // bank details for bank transfer
            bankDetails: {
                        accountName: String,
                        accountNumber: String,
                        bankName: String
            },
            paidAt: {
                        type: Date
            },
            // paystack ip address
            ipAddress: {
                        type: String
            },
            // full paystack response — useful for debugging
            paystackResponse: {
                        type: mongoose.Schema.Types.Mixed
            }
}, { timestamps: true });

const Payment = mongoose.model('Payment', paymentSchema);
export default Payment;