const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
    },
    refreshToken: {
      type: String,
      required: true,
      unique: true,
    },
    ipAddress: {
      type: String,
      required: true,
    },
    userAgent: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: "7d" },
    },
  },
  {
    timestamps: true,
    statics: {
      async createSession(userId, token, refreshToken, req) {
        console.log("Creating session for user:", userId);
        return this.create({
          userId,
          token,
          refreshToken,
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        });
      },
    },
  }
);

// Debug logging
sessionSchema.pre("findOne", function (next) {
  console.log("Querying Session with:", this.getQuery());
  next();
});

module.exports = mongoose.model("Session", sessionSchema);
