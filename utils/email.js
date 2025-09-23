const nodemailer = require("nodemailer");

// Create a transport that can use SendGrid or SMTP (e.g., Gmail)
const createTransport = () => {
  const provider =
    (process.env.EMAIL_PROVIDER || "").toLowerCase() ||
    (process.env.SENDGRID_API_KEY ? "sendgrid" : "smtp");

  if (provider === "sendgrid") {
    return nodemailer.createTransport({
      host: process.env.SENDGRID_SMTP_HOST || "smtp.sendgrid.net",
      port: Number(process.env.SENDGRID_SMTP_PORT || 587),
      secure: false,
      auth: {
        user: process.env.SENDGRID_SMTP_USER || "apikey", // required literal for SendGrid
        pass: process.env.SENDGRID_API_KEY,
      },
      pool: true,
      maxConnections: Number(process.env.SMTP_MAX_CONNECTIONS || 3),
      maxMessages: Number(process.env.SMTP_MAX_MESSAGES || 50),
      connectionTimeout: Number(process.env.SMTP_CONNECTION_TIMEOUT || 10000),
      greetingTimeout: Number(process.env.SMTP_GREETING_TIMEOUT || 10000),
      socketTimeout: Number(process.env.SMTP_SOCKET_TIMEOUT || 20000),
    });
  }

  // Default to generic SMTP (works with Gmail)
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 587),
    secure:
      process.env.SMTP_SECURE === "true" || process.env.SMTP_PORT === "465",
    auth: {
      user: process.env.SMTP_USER || process.env.GMAIL_USER,
      pass: process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD,
    },
    pool: true,
    maxConnections: Number(process.env.SMTP_MAX_CONNECTIONS || 3),
    maxMessages: Number(process.env.SMTP_MAX_MESSAGES || 50),
    connectionTimeout: Number(process.env.SMTP_CONNECTION_TIMEOUT || 10000),
    greetingTimeout: Number(process.env.SMTP_GREETING_TIMEOUT || 10000),
    socketTimeout: Number(process.env.SMTP_SOCKET_TIMEOUT || 20000),
  });
};

const transporter = createTransport();

// Determine From address
const resolveFrom = () => {
  const explicit = process.env.MAIL_FROM || process.env.SMTP_FROM;
  const sendgridFrom = process.env.SENDGRID_FROM;
  const smtpUser = process.env.SMTP_USER || process.env.GMAIL_USER;
  const email = explicit || sendgridFrom || smtpUser;
  return email
    ? email.includes("<")
      ? email
      : `"Online Test Platform" <${email}>`
    : undefined;
};

// Expose a verifier to catch config issues early
exports.verifyEmailTransport = async () => {
  try {
    await transporter.verify();
    console.log("Email transport verified and ready");
  } catch (err) {
    console.error("Email transport verification failed:", err.message || err);
  }
};

// Generic function to send email
const sendEmail = async (to, subject, html, unsubscribeLink) => {
  try {
    const mailOptions = {
      from: resolveFrom(),
      to,
      subject,
      html,
      headers: {
        "List-Unsubscribe": `<${unsubscribeLink}>`,
      },
    };

    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${to}: ${subject}`);
  } catch (error) {
    console.error(`Failed to send email to ${to}:`, error);
    throw new Error(`Email sending failed: ${error.message}`);
  }
};

// Verification Email
exports.sendVerificationEmail = async (to, token, userName = "User") => {
  const verificationUrl = `${process.env.FRONTEND_URL}/auth/verify/${token}`;
  const unsubscribeUrl = `${
    process.env.FRONTEND_URL
  }/unsubscribe?email=${encodeURIComponent(to)}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2>Welcome, ${userName}!</h2>
      <p>Thank you for registering. Please verify your email address:</p>
      <p><a href="${verificationUrl}" style="padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">Verify Email</a></p>
      <p>This link will expire in 24 hours.</p>
      <p>If you did not create this account, ignore this email or <a href="${unsubscribeUrl}">unsubscribe</a>.</p>
    </div>
  `;

  await sendEmail(
    to,
    "Verify Your Email - Online Test Platform",
    html,
    unsubscribeUrl
  );
};

// Password Reset Email
exports.sendResetEmail = async (to, token, userName = "User") => {
  const resetUrl = `${process.env.FRONTEND_URL}/auth/reset-password/${token}`;
  const unsubscribeUrl = `${
    process.env.FRONTEND_URL
  }/unsubscribe?email=${encodeURIComponent(to)}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2>Reset Your Password, ${userName}</h2>
      <p>We received a request to reset your password. Click below to set a new password:</p>
      <p><a href="${resetUrl}" style="padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
      <p>This link will expire in 1 hour.</p>
      <p>If you did not request a password reset, ignore this email or <a href="${unsubscribeUrl}">unsubscribe</a>.</p>
    </div>
  `;

  await sendEmail(
    to,
    "Reset Your Password - Online Test Platform",
    html,
    unsubscribeUrl
  );
};

// Login Success Email
exports.sendLoginSuccessEmail = async (to, userName = "User") => {
  const unsubscribeUrl = `${
    process.env.FRONTEND_URL
  }/unsubscribe?email=${encodeURIComponent(to)}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2>Login Successful, ${userName}!</h2>
      <p>You have successfully logged in to your account.</p>
      <p>If this wasn't you, secure your account by resetting your password.</p>
      <p><a href="${unsubscribeUrl}">Unsubscribe</a> from these notifications.</p>
    </div>
  `;

  await sendEmail(
    to,
    "Login Successful - Online Test Platform",
    html,
    unsubscribeUrl
  );
};

// Password Reset Success Email
exports.sendPasswordResetSuccessEmail = async (to, userName = "User") => {
  const unsubscribeUrl = `${
    process.env.FRONTEND_URL
  }/unsubscribe?email=${encodeURIComponent(to)}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2>Password Reset Successful, ${userName}!</h2>
      <p>Your password has been reset successfully. You can now log in with your new password.</p>
      <p><a href="${unsubscribeUrl}">Unsubscribe</a> from these notifications.</p>
    </div>
  `;

  await sendEmail(
    to,
    "Password Reset Successful - Online Test Platform",
    html,
    unsubscribeUrl
  );
};
