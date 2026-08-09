// OTP email template
export const otpEmailTemplate = (name, otp) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: Arial, sans-serif;
          background-color: #f4f4f4;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 40px auto;
          background-color: #ffffff;
          border-radius: 10px;
          padding: 40px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
        }
        .header h1 {
          color: #333333;
          font-size: 24px;
        }
        .otp-box {
          background-color: #f0f7ff;
          border: 2px dashed #4a90e2;
          border-radius: 8px;
          text-align: center;
          padding: 20px;
          margin: 30px 0;
        }
        .otp-code {
          font-size: 42px;
          font-weight: bold;
          color: #4a90e2;
          letter-spacing: 10px;
        }
        .warning {
          color: #e74c3c;
          font-size: 13px;
          text-align: center;
          margin-top: 10px;
        }
        .footer {
          text-align: center;
          color: #999999;
          font-size: 12px;
          margin-top: 30px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Password Reset Request</h1>
        </div>
        <p>Hello <strong>${name}</strong>,</p>
        <p>We received a request to reset your password. Use the OTP below to proceed:</p>
        <div class="otp-box">
          <div class="otp-code">${otp}</div>
        </div>
        <p class="warning">
          ⚠️ This OTP expires in <strong>10 minutes</strong>.
          Do not share it with anyone.
        </p>
        <p>If you did not request a password reset, please ignore this email. Your account is safe.</p>
        <div class="footer">
          <p>This is an automated email. Please do not reply.</p>
          <p>&copy; ${new Date().getFullYear()} LMS Platform. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};