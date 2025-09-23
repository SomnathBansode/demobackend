const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Session = require("../models/Session");
const {
  sendResetEmail,
  sendVerificationEmail,
  sendLoginSuccessEmail,
  sendPasswordResetSuccessEmail,
} = require("../utils/email");

// Validate JWT secrets
const validateJwtSecrets = () => {
  if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
    throw new Error("JWT secrets not configured");
  }
};
validateJwtSecrets();

// Generate JWT tokens
const generateAccessToken = (user) =>
  jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: "1d",
  });

const generateRefreshToken = (user) =>
  jwt.sign({ userId: user._id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: "7d",
  });

// REGISTER
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "Email already registered" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      name,
      email,
      password: hashedPassword,
      role: "user",
    });
    await user.save();

    const verificationToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );
    await sendVerificationEmail(email, verificationToken, user.name);

    res.status(201).json({ message: "User registered. Please verify email." });
  } catch (error) {
    console.error("Register failed:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// LOGIN
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "Email and password required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ message: "Invalid credentials" });

    const token = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    await Session.createSession(user._id, token, refreshToken, req);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // Send login notification asynchronously
    sendLoginSuccessEmail(user.email, user.name).catch((err) =>
      console.error("Login email failed:", err)
    );

    res.json({
      token,
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Login failed", error: error.message });
  }
};

// LOGOUT
exports.logout = async (req, res) => {
  try {
    await Session.deleteOne({
      token: req.header("Authorization")?.replace("Bearer ", ""),
    });
    res.clearCookie("refreshToken");
    res.json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout failed:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// REQUEST PASSWORD RESET
exports.requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    user.resetToken = token;
    user.resetTokenExpiry = Date.now() + 3600000;
    await user.save();

    await sendResetEmail(email, token, user.name);
    res.json({ message: "Password reset email sent" });
  } catch (error) {
    console.error("Request password reset failed:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// RESET PASSWORD
exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() },
    });
    if (!user)
      return res
        .status(400)
        .json({ message: "Invalid or expired reset token" });

    user.password = await bcrypt.hash(password, 10);
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();

    await sendPasswordResetSuccessEmail(user.email, user.name);
    res.json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("Reset password failed:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// VERIFY EMAIL
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.isVerified = true;
    await user.save();
    res.json({ message: "Email verified successfully" });
  } catch (error) {
    console.error("Verify email failed:", error);
    res.status(400).json({ message: "Invalid or expired verification token" });
  }
};

// GET CURRENT USER
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
    });
  } catch (error) {
    console.error("Get user failed:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// UPDATE PROFILE
exports.updateMe = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: "Name is required" });

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { name },
      { new: true, runValidators: true }
    ).select("name email role");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json(user);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to update profile", error: err.message });
  }
};

// CHANGE PASSWORD
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 6)
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });

    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch)
      return res.status(401).json({ message: "Current password is incorrect" });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ message: "Password changed successfully" });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to change password", error: err.message });
  }
};

// REFRESH TOKEN
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken)
      return res.status(401).json({ message: "Refresh token required" });

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user)
      return res.status(401).json({ message: "Invalid refresh token" });

    const session = await Session.findOne({ refreshToken });
    if (!session)
      return res.status(401).json({ message: "Invalid refresh token" });

    const accessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    session.token = accessToken;
    session.refreshToken = newRefreshToken;
    session.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await session.save();

    res.json({ accessToken, refreshToken: newRefreshToken });
  } catch (error) {
    console.error("Refresh token error:", error);
    res.status(401).json({ message: "Invalid refresh token" });
  }
};
