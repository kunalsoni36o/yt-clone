import nodemailer from "nodemailer";

const createTransporter = () => {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
};

export const sendSubscriptionConfirmation = async ({
  to,
  userName,
  planName,
  amount,
  currency,
  invoiceNumber,
  paymentId,
  validUntil,
}) => {
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER || "noreply@yourtube.local";
  const amountDisplay = `${currency} ${(amount / 100).toFixed(2)}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto;">
      <h2 style="color: #dc2626;">YourTube Premium — Payment Confirmed</h2>
      <p>Hi ${userName || "there"},</p>
      <p>Thank you for upgrading to the <strong>${planName}</strong> plan.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee;">Invoice</td><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>${invoiceNumber}</strong></td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee;">Plan</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${planName}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee;">Amount paid</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${amountDisplay}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee;">Payment ID</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${paymentId}</td></tr>
        <tr><td style="padding: 8px;">Valid until</td><td style="padding: 8px;">${validUntil}</td></tr>
      </table>
      <p>Your premium benefits are now active. Enjoy ad-free viewing, extended watch time, and more downloads.</p>
      <p style="color: #666; font-size: 12px;">This is a test-mode receipt from YourTube.</p>
    </div>
  `;

  const transporter = createTransporter();

  if (!transporter) {
    console.log("[Email] SMTP not configured — confirmation logged to console:");
    console.log({ to, planName, invoiceNumber, paymentId, amountDisplay, validUntil });
    return { sent: false, logged: true };
  }

  await transporter.sendMail({
    from,
    to,
    subject: `YourTube Premium — ${planName} plan confirmed (${invoiceNumber})`,
    html,
  });

  return { sent: true };
};

export const sendOtpEmail = async ({ to, userName, otpCode }) => {
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER || "noreply@yourtube.local";
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; rounded: 8px;">
      <h2 style="color: #dc2626; margin-bottom: 16px;">Security Verification Code</h2>
      <p>Hi ${userName || "User"},</p>
      <p>We detected a login attempt from a new device or location. To verify your identity, please enter the following verification code:</p>
      <div style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #111827; text-align: center; margin: 24px 0; padding: 12px; background-color: #f3f4f6; border-radius: 6px;">
        ${otpCode}
      </div>
      <p>This code is valid for 5 minutes. If you did not make this request, please secure your account immediately.</p>
      <p style="color: #6b7280; font-size: 12px; margin-top: 24px;">This is an automated security email from YourTube.</p>
    </div>
  `;

  const transporter = createTransporter();

  if (!transporter) {
    console.log("[Email] SMTP not configured — OTP logged to console:");
    console.log({ to, otpCode });
    return { sent: false, logged: true };
  }

  await transporter.sendMail({
    from,
    to,
    subject: "YourTube Security Verification Code",
    html,
  });

  return { sent: true };
};

