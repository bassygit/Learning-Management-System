import nodemailer from 'nodemailer';
import dns from 'node:dns';

const sendEmail = async ({ to, subject, html }) => {
            try {
                        // create transporter
                        const transporter = nodemailer.createTransport({
                                    host: process.env.EMAIL_HOST,
                                    port: parseInt(process.env.EMAIL_PORT) || 587,
                                    secure: false, // false for port 587
                                    auth: {
                                                user: process.env.EMAIL_USER,
                                                pass: process.env.EMAIL_PASS
                                    },
                                    // THIS FORCES DNS TO RESOLVE ONLY IPV4 ADDRESSES
                                    lookup: (hostname, options, callback) => {
                                                return dns.lookup(hostname, { family: 4 }, callback);
                                    },
                                    tls: {
                                                rejectUnauthorized: false
                                    }
                        });

                        // send email
                        const info = await transporter.sendMail({
                                    from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_USER}>`,
                                    to,
                                    subject,
                                    html
                        });

                        console.log('Email sent:', info.messageId);
                        return info;

            } catch (error) {
                        console.error('Email error:', error);
                        throw new Error('Email could not be sent');
            }
};

export default sendEmail;



// import nodemailer from 'nodemailer';

// const sendEmail = async ({ to, subject, html }) => {
//             try {
//                         // create transporter
//                         const transporter = nodemailer.createTransport({
//                                     host: process.env.EMAIL_HOST,
//                                     port: process.env.EMAIL_PORT,
//                                     secure: false,
//                                     auth: {
//                                                 user: process.env.EMAIL_USER,
//                                                 pass: process.env.EMAIL_PASS
//                                     }
//                         });

//                         // send email
//                         const info = await transporter.sendMail({
//                                     from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_USER}>`,
//                                     to,
//                                     subject,
//                                     html
//                         });

//                         console.log('Email sent:', info.messageId);
//                         return info;

//             } catch (error) {
//                         console.error('Email error:', error);
//                         throw new Error('Email could not be sent');
//             }
// };

// export default sendEmail;