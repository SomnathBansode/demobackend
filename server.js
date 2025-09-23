require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const morgan = require("morgan");
const compression = require("compression");
const path = require("path");

// Route imports
const testRoutes = require("./routes/tests");
const authRoutes = require("./routes/auth");
const analyticsRoutes = require("./routes/analytics");
const userRoutes = require("./routes/users");
const assignmentRoutes = require("./routes/assignments");
const groupRoutes = require("./routes/groups");
const resultsRoutes = require("./routes/results");
const statsRoutes = require("./routes/stats");
const securityRoutes = require("./routes/security");
const { initializeGridFS, uploadFileToGridFS } = require("./utils/gridfs");

const app = express();

// Database connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connected");

    mongoose.connection.on("connected", () => {
      console.log("Mongoose connected to DB");
    });

    mongoose.connection.on("error", (err) => {
      console.error("Mongoose connection error:", err);
    });

    mongoose.connection.on("disconnected", () => {
      console.log("Mongoose disconnected");
    });
  } catch (err) {
    console.error("MongoDB Connection Error:", err);
    process.exit(1);
  }
};

// Middleware
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Enhanced CORS Configuration
const defaultOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://nexlearn.netlify.app",
  "https://nexlearndemo.netlify.app",
];
// Include FRONTEND_URL automatically (trim trailing slash)
const envFrontend = (process.env.FRONTEND_URL || "").replace(/\/$/, "");
const envOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);
const allowedOrigins = Array.from(
  new Set([
    ...defaultOrigins,
    ...envOrigins,
    ...(envFrontend ? [envFrontend] : []),
  ])
);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (no Origin header) and whitelisted origins
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  // Let cors library reflect requested headers automatically
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// Logging
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// File upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});
app.post("/api/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    const fileId = await uploadFileToGridFS(req.file, req.file.originalname);
    res.json({ message: "File uploaded", fileId });
  } catch (error) {
    console.error("File upload error:", error);
    res.status(500).json({ message: "Upload failed", error: error.message });
  }
});

// API Routes - Add error handling for route imports
try {
  app.use("/api/tests", testRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/analytics", analyticsRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/assignments", assignmentRoutes);
  app.use("/api/groups", groupRoutes);
  app.use("/api/results", resultsRoutes);
  app.use("/api/stats", statsRoutes);
  app.use("/api/security", securityRoutes);
} catch (err) {
  console.error("Route initialization error:", err);
  process.exit(1);
}

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    dbStatus:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    version: process.env.npm_package_version,
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: "Internal Server Error",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// Server startup
const startServer = async () => {
  await connectDB();
  await initializeGridFS();
  // Verify email transport once at startup for clearer diagnostics
  try {
    const { verifyEmailTransport } = require("./utils/email");
    if (verifyEmailTransport) await verifyEmailTransport();
  } catch (e) {
    console.error("Email transport init check failed:", e?.message || e);
  }

  const PORT = process.env.PORT || 5000;
  const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
    console.log(`Version: ${process.env.npm_package_version}`);
  });

  // Graceful shutdown
  const shutdown = async () => {
    console.log("Shutting down gracefully...");
    server.close(async () => {
      await mongoose.connection.close(false);
      console.log("MongoDB connection closed");
      process.exit(0);
    });
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
};

startServer().catch((err) => {
  console.error("Server startup error:", err);
  process.exit(1);
});
