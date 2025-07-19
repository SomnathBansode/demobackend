const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    isVerified: { type: Boolean, default: false },
    resetToken: { type: String },
    resetTokenExpiry: { type: Date },
    receiveEmails: { type: Boolean, default: true }, // Added for unsubscribe
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Add indexes for faster queries
userSchema.index({ _id: 1, email: 1 });

// Debug logging
userSchema.pre("findOne", function (next) {
  console.log("Querying User with:", this.getQuery());
  next();
});

module.exports = mongoose.model("User", userSchema);
