const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false, // Adjust for production
  },
});

const sendEmail = async (to, subject, html, unsubscribeLink) => {
  try {
    const mailOptions = {
      from: `"Online Test Platform" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html,
      replyTo: process.env.GMAIL_USER,
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

exports.sendVerificationEmail = async (to, token, userName = "User") => {
  const verificationUrl = `${process.env.FRONTEND_URL}/auth/verify/${token}`;
  const unsubscribeUrl = `${
    process.env.FRONTEND_URL
  }/unsubscribe?email=${encodeURIComponent(to)}`;
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .button { display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; }
          .footer { font-size: 12px; color: #777; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Welcome, ${userName}!</h2>
          <p>Thank you for registering with Online Test Platform. Please verify your email address to activate your account:</p>
          <p><a href="${verificationUrl}" class="button">Verify Email</a></p>
          <p>This link will expire in 24 hours.</p>
          <div class="footer">
            <p>If you did not create this account, you can ignore this email or <a href="${unsubscribeUrl}">unsubscribe</a>.</p>
            <p>© ${new Date().getFullYear()} Online Test Platform. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  await sendEmail(
    to,
    "Verify Your Email - Online Test Platform",
    html,
    unsubscribeUrl
  );
};

exports.sendResetEmail = async (to, token, userName = "User") => {
  const resetUrl = `${process.env.FRONTEND_URL}/auth/reset-password/${token}`;
  const unsubscribeUrl = `${
    process.env.FRONTEND_URL
  }/unsubscribe?email=${encodeURIComponent(to)}`;
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .button { display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; }
          .footer { font-size: 12px; color: #777; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Reset Your Password, ${userName}</h2>
          <p>We received a request to reset your password for Online Test Platform. Click the button below to set a new password:</p>
          <p><a href="${resetUrl}" class="button">Reset Password</a></p>
          <p>This link will expire in 1 hour.</p>
          <div class="footer">
            <p>If you did not request a password reset, you can ignore this email or <a href="${unsubscribeUrl}">unsubscribe</a>.</p>
            <p>© ${new Date().getFullYear()} Online Test Platform. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  await sendEmail(
    to,
    "Reset Your Password - Online Test Platform",
    html,
    unsubscribeUrl
  );
};

exports.sendLoginSuccessEmail = async (to, userName = "User") => {
  const unsubscribeUrl = `${
    process.env.FRONTEND_URL
  }/unsubscribe?email=${encodeURIComponent(to)}`;
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .footer { font-size: 12px; color: #777; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Login Successful, ${userName}!</h2>
          <p>You have successfully logged in to your Online Test Platform account.</p>
          <p>If this was not you, please secure your account by resetting your password.</p>
          <div class="footer">
            <p><a href="${unsubscribeUrl}">Unsubscribe</a> from these notifications.</p>
            <p>© ${new Date().getFullYear()} Online Test Platform. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  await sendEmail(
    to,
    "Login Successful - Online Test Platform",
    html,
    unsubscribeUrl
  );
};

exports.sendPasswordResetSuccessEmail = async (to, userName = "User") => {
  const unsubscribeUrl = `${
    process.env.FRONTEND_URL
  }/unsubscribe?email=${encodeURIComponent(to)}`;
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .footer { font-size: 12px; color: #777; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Password Reset Successful, ${userName}!</h2>
          <p>Your password for Online Test Platform has been reset successfully.</p>
          <p>You can now log in with your new password.</p>
          <div class="footer">
            <p><a href="${unsubscribeUrl}">Unsubscribe</a> from these notifications.</p>
            <p>© ${new Date().getFullYear()} Online Test Platform. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  await sendEmail(
    to,
    "Password Reset Successful - Online Test Platform",
    html,
    unsubscribeUrl
  );
};
