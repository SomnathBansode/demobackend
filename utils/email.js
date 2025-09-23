const nodemailer = require("nodemailer");

// Create transporter using SendGrid
const transporter = nodemailer.createTransport({
  host: "smtp.sendgrid.net",
  port: 587,
  secure: false, // true for port 465, false for 587
  auth: {
    user: "apikey", // Must be "apikey"
    pass: process.env.SENDGRID_API_KEY, // Your SendGrid API Key
  },
});

// Generic function to send email
const sendEmail = async (to, subject, html, unsubscribeLink) => {
  try {
    const mailOptions = {
      from: process.env.SENDGRID_FROM,
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
