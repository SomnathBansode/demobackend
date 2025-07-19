const mongoose = require("mongoose");

const testSchema = new mongoose.Schema(
  {
    title: {
      en: { type: String, required: true },
      mr: { type: String, required: true },
    },
    description: {
      en: { type: String },
      mr: { type: String },
    },
    totalMarks: { type: Number, required: true },
    duration: { type: Number, required: true }, // in minutes
    questions: [
      {
        questionText: {
          en: { type: String, required: true },
          mr: { type: String, required: true },
        },
        options: [
          {
            en: { type: String, required: true },
            mr: { type: String, required: true },
          },
        ],
        correctAnswer: { type: Number, required: true },
        marks: { type: Number, default: 1 },
      },
    ],
    pdfUrl: { type: String },
    pdfDownloadEnabled: { type: Boolean, default: false },
    screenshotEnabled: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Test", testSchema);
