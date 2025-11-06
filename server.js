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
    "https://nex-learn.netlify.app",
  "https://nexlearndemo.netlify.app",
  "https://nexlearnoriginal.netlify.app",
];
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
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
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

// API Routes
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

// Root route (for keepalive + quick status)
app.get("/", (req, res) => {
  res.status(200).json({
    status: "OK",
    service: "NexLearn API",
    timestamp: new Date().toISOString(),
  });
});

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

    // --- Keepalive pinger ---
    try {
      const baseUrl = (
        process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`
      ).replace(/\/$/, "");
      const minMinutes = 13;
      const maxMinutes = 15;

      const ping = async () => {
        const target = `${baseUrl}/?ping=${Date.now()}`;
        try {
          if (typeof fetch === "function") {
            const res = await fetch(target, {
              method: "GET",
              cache: "no-store",
              headers: {
                "Cache-Control":
                  "no-store, no-cache, max-age=0, must-revalidate",
                Pragma: "no-cache",
                "User-Agent": "keepalive/1.0",
              },
            });
            if (!res.ok) throw new Error(`status ${res.status}`);
          } else {
            const https = require("https");
            await new Promise((resolve, reject) => {
              const req = https.get(target, (res) => {
                const ok =
                  (res.statusCode || 0) >= 200 && (res.statusCode || 0) < 300;
                if (!ok) reject(new Error(`status ${res.statusCode}`));
                else resolve();
                res.resume();
              });
              req.on("error", reject);
            });
          }
        } catch (err) {
          console.warn("Keepalive ping failed:", err.message);
        }
      };

      const nextDelayMs = () => {
        const minMs = minMinutes * 60 * 1000;
        const maxMs = maxMinutes * 60 * 1000;
        return Math.floor(minMs + Math.random() * (maxMs - minMs));
      };

      ping(); // initial ping
      (function scheduleNext() {
        setTimeout(async () => {
          await ping();
          scheduleNext();
        }, nextDelayMs());
      })();

      console.log(
        `Keepalive enabled: pinging ${baseUrl}/ every ${minMinutes}-${maxMinutes} minutes`
      );
    } catch (e) {
      console.warn("Keepalive setup skipped:", e.message);
    }
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
