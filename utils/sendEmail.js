const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Sends an OTP email to the given address.
 * @param {string} to  - Recipient email
 * @param {string} name - Recipient name
 * @param {string} otp  - The 6-digit OTP code
 */
const sendOtpEmail = async (to, name, otp) => {
  const mailOptions = {
    from: `"Habitz App" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Your Habitz Verification Code',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      </head>
      <body style="margin:0;padding:0;background:#f4f4f8;font-family:'Segoe UI',Arial,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f8;padding:40px 0;">
          <tr><td align="center">
            <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
              
              <!-- Header -->
              <tr>
                <td style="background:linear-gradient(135deg,#1a56db,#6366f1);padding:36px 40px;text-align:center;">
                  <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:800;letter-spacing:-0.5px;">This Time For Real</h1>
                  <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:14px;">Habitz — Your habit tracking companion</p>
                </td>
              </tr>

              <!-- Body -->
              <tr>
                <td style="padding:40px;">
                  <p style="margin:0 0 8px;color:#374151;font-size:16px;">Hi <strong>${name}</strong>,</p>
                  <p style="margin:0 0 32px;color:#6b7280;font-size:15px;line-height:1.6;">
                    Use the verification code below to complete your registration. This code expires in <strong>10 minutes</strong>.
                  </p>

                  <!-- OTP Box -->
                  <div style="background:#f0f4ff;border:2px dashed #6366f1;border-radius:16px;padding:28px;text-align:center;margin-bottom:32px;">
                    <p style="margin:0 0 8px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:2px;font-weight:600;">Verification Code</p>
                    <p style="margin:0;color:#1a56db;font-size:48px;font-weight:800;letter-spacing:12px;">${otp}</p>
                  </div>

                  <p style="margin:0;color:#9ca3af;font-size:13px;line-height:1.6;">
                    If you didn't request this, you can safely ignore this email. Your account won't be created unless the code is entered.
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background:#f9fafb;padding:24px 40px;text-align:center;border-top:1px solid #e5e7eb;">
                  <p style="margin:0;color:#9ca3af;font-size:12px;">© ${new Date().getFullYear()} Habitz · This Time For Real</p>
                </td>
              </tr>

            </table>
          </td></tr>
        </table>
      </body>
      </html>
    `,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = { sendOtpEmail };
