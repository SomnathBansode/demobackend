const jwt = require("jsonwebtoken");
const Session = require("../models/Session");

const authMiddleware = async (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    console.log("No token provided");
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Decoded token:", decoded);

    const session = await Session.findOne({
      userId: decoded.userId,
      token,
    });

    if (!session) {
      console.log("Invalid session for user:", decoded.userId);
      return res.status(401).json({ message: "Invalid session" });
    }

    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp < now) {
      console.log("Token expired for user:", decoded.userId);
      return res.status(401).json({
        message: "Token expired",
        code: "TOKEN_EXPIRED",
      });
    }

    req.user = decoded;
    req.session = session;
    next();
  } catch (error) {
    console.error("Auth error:", error);
    res.status(401).json({
      message:
        error.name === "TokenExpiredError" ? "Token expired" : "Invalid token",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const adminMiddleware = (req, res, next) => {
  if (req.user.role !== "admin") {
    console.error(`User ${req.user.userId} is not an admin`);
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
};

const verifyRefreshToken = async (req, res, next) => {
  const token = req.body.refreshToken;
  if (!token) {
    console.log("No refresh token provided");
    return res.status(401).json({ message: "No refresh token" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    console.log("Decoded refresh token:", decoded);
    req.user = decoded;
    next();
  } catch (error) {
    console.error("Refresh token verification error:", error);
    res.status(401).json({ message: "Invalid refresh token" });
  }
};

module.exports = { authMiddleware, adminMiddleware, verifyRefreshToken };
