import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

try {
  await transporter.verify();
  console.log('[SMTP] ✅ Connection verified — credentials are VALID');

  const testOtp = '857321';
  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: process.env.SMTP_USER,
    subject: `YourTube Security Test — Code ${testOtp}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:20px;border:1px solid #e5e7eb;border-radius:8px;">
      <h2 style="color:#dc2626;">Security Verification Code</h2>
      <p>Hi there,</p>
      <p>This is a test OTP email from your YourTube platform. Your code is:</p>
      <div style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#111827;text-align:center;margin:24px 0;padding:16px;background-color:#f3f4f6;border-radius:6px;">${testOtp}</div>
      <p style="color:#6b7280;font-size:12px;">This code is valid for 5 minutes. SMTP configuration is working correctly.</p>
    </div>`,
  });

  console.log('[SMTP] ✅ Test OTP email SENT successfully!');
  console.log('[SMTP]    Message ID:', info.messageId);
  console.log('[SMTP]    Recipient :', process.env.SMTP_USER);
} catch (err) {
  console.error('[SMTP] ❌ FAILED:', err.message);
  if (err.code) console.error('[SMTP]    Error code:', err.code);
  if (err.responseCode) console.error('[SMTP]    Response code:', err.responseCode);
}
