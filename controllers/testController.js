const mongoose = require("mongoose");
const Test = require("../models/Test");
const Result = require("../models/Result");
const TestSession = require("../models/TestSession");
const { ObjectId } = mongoose.Types; // Add this line at the top
const {
  uploadFileToGridFS,
  downloadFileFromGridFS,
  deleteFileFromGridFS,
} = require("../utils/gridfs");
const { parse } = require("csv-parse");

exports.getTests = async (req, res) => {
  try {
    const tests = await Test.find()
      .select("title description totalMarks duration")
      .lean();
    res.json(tests);
  } catch (error) {
    console.error("Get tests failed:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getTest = async (req, res) => {
  try {
    const test = await Test.findById(req.params.testId).lean();
    if (!test) {
      return res.status(404).json({ message: "Test not found" });
    }
    res.json(test);
  } catch (error) {
    console.error(`Get test failed for ID ${req.params.testId}:`, error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.createTest = async (req, res) => {
  try {
    const { title, description, totalMarks, duration, questions } = req.body;
    const test = new Test({
      title,
      description,
      totalMarks,
      duration,
      questions,
    });
    await test.save();
    res.status(201).json(test);
  } catch (error) {
    console.error("Create test failed:", error);
    res
      .status(400)
      .json({ message: "Failed to create test", error: error.message });
  }
};

exports.updateTest = async (req, res) => {
  try {
    const { title, description, totalMarks, duration, questions } = req.body;
    const test = await Test.findByIdAndUpdate(
      req.params.testId,
      { title, description, totalMarks, duration, questions },
      { new: true }
    );
    if (!test) {
      return res.status(404).json({ message: "Test not found" });
    }
    res.json(test);
  } catch (error) {
    console.error(`Update test failed for ID ${req.params.testId}:`, error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.deleteTest = async (req, res) => {
  try {
    const test = await Test.findByIdAndDelete(req.params.testId);
    if (!test) {
      return res.status(404).json({ message: "Test not found" });
    }
    // Delete related results
    const resultDelete = await Result.deleteMany({ testId: req.params.testId });
    // Delete related test sessions
    const sessionDelete = await TestSession.deleteMany({
      testId: req.params.testId,
    });
    // Delete PDF from GridFS if exists
    if (test.pdfUrl) {
      await deleteFileFromGridFS(test.pdfUrl);
    }
    res.json({
      message: "Test and all related data deleted successfully",
      deletedResults: resultDelete.deletedCount,
      deletedSessions: sessionDelete.deletedCount,
    });
  } catch (error) {
    console.error(`Delete test failed for ID ${req.params.testId}:`, error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.updatePdfSettings = async (req, res) => {
  try {
    const { pdfDownloadEnabled, screenshotEnabled } = req.body;
    const test = await Test.findByIdAndUpdate(
      req.params.testId,
      { pdfDownloadEnabled, screenshotEnabled },
      { new: true }
    );
    if (!test) {
      return res.status(404).json({ message: "Test not found" });
    }
    res.json(test);
  } catch (error) {
    console.error(
      `Update PDF settings failed for ID ${req.params.testId}:`,
      error
    );
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getPdf = async (req, res) => {
  try {
    if (!mongoose.connection.db) {
      return res.status(500).json({
        message: "Database not connected",
        error: "Mongoose connection not established",
      });
    }
    const test = await Test.findById(req.params.testId);
    if (!test) {
      return res.status(404).json({ message: "Test not found" });
    }
    if (!test.pdfDownloadEnabled) {
      return res.status(403).json({ message: "PDF download not enabled" });
    }
    if (!test.pdfUrl) {
      return res.status(404).json({ message: "PDF not available" });
    }
    if (!mongoose.Types.ObjectId.isValid(test.pdfUrl)) {
      return res.status(400).json({
        message: "Invalid PDF file ID",
        error: `Invalid ObjectId: ${test.pdfUrl}`,
      });
    }
    await downloadFileFromGridFS(test.pdfUrl, res);
  } catch (error) {
    console.error(`Get PDF failed for test ID ${req.params.testId}:`, error);
    res.status(500).json({
      message: "Failed to retrieve PDF from storage",
      error: error.message,
    });
  }
};

exports.uploadTest = async (req, res) => {
  try {
    const test = await Test.findById(req.params.testId);
    if (!test) {
      return res.status(404).json({ message: "Test not found" });
    }
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    if (req.file.mimetype !== "application/pdf") {
      return res.status(400).json({ message: "Only PDF files are allowed" });
    }

    if (test.pdfUrl) {
      await deleteFileFromGridFS(test.pdfUrl);
    }

    const fileId = await uploadFileToGridFS(
      req.file,
      `test_${req.params.testId}_${Date.now()}.pdf`
    );
    test.pdfUrl = fileId.toString();
    test.pdfDownloadEnabled = true;
    await test.save();

    res.json({ message: "PDF uploaded successfully", pdfUrl: test.pdfUrl });
  } catch (error) {
    console.error(
      `Upload test failed for test ID ${req.params.testId}:`,
      error
    );
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.bulkUploadQuestions = async (req, res) => {
  try {
    const test = await Test.findById(req.params.testId);
    if (!test) {
      return res.status(404).json({ message: "Test not found" });
    }
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const mime = req.file.mimetype;
    const ext = req.file.originalname.split(".").pop().toLowerCase();
    let questions = [];
    if (mime === "text/csv" || ext === "csv") {
      // CSV parsing (existing logic)
      const results = [];
      const parser = parse({
        columns: true,
        skip_empty_lines: true,
        trim: true,
        bom: true,
      });
      const stream = require("stream");
      const readableStream = new stream.PassThrough();
      readableStream.end(req.file.buffer);
      readableStream
        .pipe(parser)
        .on("data", (row) => {
          const normalizedRow = {};
          Object.keys(row).forEach((key) => {
            normalizedRow[key.trim().toLowerCase()] =
              typeof row[key] === "string" ? row[key].trim() : row[key];
          });
          if (
            !normalizedRow["questiontext_en"] ||
            !normalizedRow["questiontext_mr"] ||
            !normalizedRow["option1_en"] ||
            !normalizedRow["option1_mr"] ||
            !normalizedRow["option2_en"] ||
            !normalizedRow["option2_mr"] ||
            !normalizedRow["option3_en"] ||
            !normalizedRow["option3_mr"] ||
            !normalizedRow["option4_en"] ||
            !normalizedRow["option4_mr"] ||
            normalizedRow["correctanswer"] === undefined ||
            normalizedRow["correctanswer"] === ""
          ) {
            return;
          }
          const correctAnswer = parseInt(normalizedRow["correctanswer"], 10);
          if (isNaN(correctAnswer) || correctAnswer < 0 || correctAnswer > 3)
            return;
          results.push({
            questionText: {
              en: normalizedRow["questiontext_en"],
              mr: normalizedRow["questiontext_mr"],
            },
            options: [
              {
                en: normalizedRow["option1_en"],
                mr: normalizedRow["option1_mr"],
              },
              {
                en: normalizedRow["option2_en"],
                mr: normalizedRow["option2_mr"],
              },
              {
                en: normalizedRow["option3_en"],
                mr: normalizedRow["option3_mr"],
              },
              {
                en: normalizedRow["option4_en"],
                mr: normalizedRow["option4_mr"],
              },
            ],
            correctAnswer,
            marks: parseInt(normalizedRow["marks"], 10) || 1,
          });
        })
        .on("end", async () => {
          if (results.length === 0) {
            return res
              .status(400)
              .json({ message: "No valid questions in CSV" });
          }
          test.questions = results;
          await test.save();
          res.json({
            message: "Questions uploaded successfully",
            questionCount: results.length,
          });
        })
        .on("error", (error) => {
          res
            .status(400)
            .json({ message: "Failed to parse CSV", error: error.message });
        });
      return;
    } else if (mime === "application/json" || ext === "json") {
      // JSON parsing
      try {
        const jsonString = req.file.buffer.toString("utf-8");
        const data = JSON.parse(jsonString);
        if (!Array.isArray(data) || !data.length)
          throw new Error("Invalid JSON");
        questions = data.map((q) => ({
          questionText: {
            en: q.questionText_en,
            mr: q.questionText_mr,
          },
          options: [
            { en: q.option1_en, mr: q.option1_mr },
            { en: q.option2_en, mr: q.option2_mr },
            { en: q.option3_en, mr: q.option3_mr },
            { en: q.option4_en, mr: q.option4_mr },
          ],
          correctAnswer: parseInt(q.correctAnswer, 10),
          marks: parseInt(q.marks, 10) || 1,
        }));
      } catch (err) {
        return res.status(400).json({ message: "Invalid JSON file" });
      }
    } else if (
      mime ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      mime === "application/vnd.ms-excel" ||
      ext === "xlsx" ||
      ext === "xls"
    ) {
      // Excel parsing
      try {
        const XLSX = require("xlsx");
        const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet);
        if (!Array.isArray(data) || !data.length)
          throw new Error("Invalid Excel");
        questions = data.map((q) => ({
          questionText: {
            en: q.questionText_en,
            mr: q.questionText_mr,
          },
          options: [
            { en: q.option1_en, mr: q.option1_mr },
            { en: q.option2_en, mr: q.option2_mr },
            { en: q.option3_en, mr: q.option3_mr },
            { en: q.option4_en, mr: q.option4_mr },
          ],
          correctAnswer: parseInt(q.correctAnswer, 10),
          marks: parseInt(q.marks, 10) || 1,
        }));
      } catch (err) {
        return res.status(400).json({ message: "Invalid Excel file" });
      }
    } else {
      return res
        .status(400)
        .json({ message: "Only CSV, JSON, or Excel files are allowed" });
    }

    if (questions.length === 0) {
      return res
        .status(400)
        .json({ message: "No valid questions found in file" });
    }
    test.questions = questions;
    await test.save();
    res.json({
      message: "Questions uploaded successfully",
      questionCount: questions.length,
    });
  } catch (error) {
    console.error(
      `Bulk upload questions failed for test ID ${req.params.testId}:`,
      error
    );
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getAvailableTests = async (req, res) => {
  try {
    const tests = await Test.find({})
      .select("title description totalMarks duration")
      .lean();
    res.json(tests);
  } catch (error) {
    console.error("Get available tests failed:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.startTest = async (req, res) => {
  try {
    const test = await Test.findById(req.params.testId);
    if (!test) {
      return res.status(404).json({ message: "Test not found" });
    }

    const previousAttempts = await Result.countDocuments({
      userId: req.user.userId,
      testId: req.params.testId,
    });

    const endTime = new Date(Date.now() + test.duration * 60 * 1000);
    const session = new TestSession({
      userId: req.user.userId,
      testId: req.params.testId,
      startTime: new Date(),
      endTime,
      status: "active",
    });
    await session.save();

    const rules = {
      title: test.title,
      description: test.description,
      totalMarks: test.totalMarks,
      duration: test.duration,
      questions: test.questions, // <-- Add questions to rules
      instructions: {
        en: "Read each question carefully. Select one option per question. Submit before the timer ends.",
        mr: "प्रत्येक प्रश्न काळजीपूर्वक वाचा. प्रत्येक प्रश्नासाठी एक पर्याय निवडा. टायमर संपण्यापूर्वी सबमिट करा.",
      },
      screenshotEnabled: test.screenshotEnabled,
    };

    res.json({
      message: "Test started successfully",
      testId: test._id,
      sessionId: session._id,
      rules,
      attemptNumber: previousAttempts + 1,
      endTime,
    });
  } catch (error) {
    console.error(`Start test failed for test ID ${req.params.testId}:`, error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.submitTest = async (req, res) => {
  try {
    const { answers, sessionId } = req.body;
    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
      return res.status(400).json({ message: "Invalid session ID format" });
    }

    const test = await Test.findById(req.params.testId);
    if (!test) {
      return res.status(404).json({ message: "Test not found" });
    }

    const session = await TestSession.findOne({
      _id: sessionId,
      userId: req.user.userId,
      testId: req.params.testId,
      status: "active",
    });
    if (!session) {
      return res.status(400).json({ message: "No active test session found" });
    }

    // Calculate score and create result
    let score = 0;
    let correctAnswers = 0;
    let incorrectAnswers = 0;
    let unanswered = test.questions.length;

    const results = answers.map(({ questionIndex, selectedOption }) => {
      const question = test.questions[questionIndex];
      if (!question)
        return {
          questionIndex,
          selectedOption,
          correctAnswer: null,
          isCorrect: false,
        };

      const isAnswered =
        typeof selectedOption === "number" && selectedOption >= 0;
      const isCorrect = isAnswered && selectedOption === question.correctAnswer;

      if (isCorrect) {
        score += question.marks || 1;
        correctAnswers++;
        unanswered--;
      } else if (isAnswered) {
        incorrectAnswers++;
        unanswered--;
      }

      return {
        questionIndex,
        selectedOption,
        correctAnswer: question.correctAnswer,
        isCorrect,
      };
    });

    // Get attempt number (count existing results + 1)
    const attemptNumber =
      (await Result.countDocuments({
        userId: req.user.userId,
        testId: req.params.testId,
      })) + 1;

    // Save the result
    const result = new Result({
      userId: req.user.userId,
      testId: req.params.testId,
      score,
      answers: results,
      correctAnswers,
      incorrectAnswers,
      unanswered,
      attemptNumber,
    });

    await result.save();
    session.status = "completed";
    await session.save();

    res.json({
      message: "Test submitted successfully",
      score,
      resultId: result._id,
      correctAnswers,
      incorrectAnswers,
      unanswered,
      attemptNumber,
    });
  } catch (error) {
    console.error(`Submit test failed:`, error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
exports.getTestResult = async (req, res) => {
  try {
    // Find the latest result for this user and test
    const result = await Result.findOne({
      userId: req.user.userId,
      testId: req.params.testId,
    })
      .sort({ submittedAt: -1, createdAt: -1 }) // Get the latest attempt
      .populate("testId", "title totalMarks questions")
      .lean();
    if (!result) {
      return res.status(404).json({ message: "Result not found" });
    }
    res.json({
      testTitle: result.testId.title,
      totalMarks: result.testId.totalMarks,
      questions: result.testId.questions, // Include questions
      answers: result.answers, // User's answers
      score: result.score,
      correctAnswers: result.correctAnswers,
      incorrectAnswers: result.incorrectAnswers,
      unanswered: result.unanswered,
      attemptNumber: result.attemptNumber,
      submittedAt: result.submittedAt,
    });
  } catch (error) {
    console.error(
      `Get test result failed for test ID ${req.params.testId}:`,
      error
    );
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
exports.streamTestResult = async (req, res) => {
  try {
    console.log(
      `Streaming test result for test ID: ${req.params.testId}, user: ${req.user.userId}`
    );
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const sendEvent = (data) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    const checkResult = async () => {
      const result = await Result.findOne({
        userId: req.user.userId,
        testId: req.params.testId,
      })
        .populate("testId", "title totalMarks questions")
        .lean(); // Include questions for frontend

      if (result) {
        sendEvent({
          status: "completed",
          data: {
            test: {
              title: result.testId.title,
              totalMarks: result.testId.totalMarks,
              questions: result.testId.questions, // Include questions
            },
            score: result.score,
            correctAnswers: result.correctAnswers,
            incorrectAnswers: result.incorrectAnswers,
            unanswered: result.unanswered,
            attemptNumber: result.attemptNumber,
            submittedAt: result.submittedAt,
            answers: result.answers, // Include answers for frontend
          },
        });
        res.end();
      } else {
        sendEvent({ status: "pending" });
      }
    };

    // Check immediately and every 5 seconds
    await checkResult();
    const interval = setInterval(checkResult, 5000);

    // Cleanup on client disconnect
    req.on("close", () => {
      clearInterval(interval);
      res.end();
    });
  } catch (error) {
    console.error(
      `Stream test result failed for test ID ${req.params.testId}:`,
      error
    );
    res.write(
      `data: ${JSON.stringify({ status: "error", message: error.message })}\n\n`
    );
    res.end();
  }
};

// Allow user to re-attempt a test
// In your testController.js
// Fix for getReattemptableTests
// Fix for getReattemptableTests
exports.getReattemptableTests = async (req, res) => {
  try {
    const userId = req.user.userId;
    const DEFAULT_MAX_ATTEMPTS = 3;

    // Get all tests the user has attempted
    const userAttempts = await Result.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
        },
      },
      {
        $group: {
          _id: "$testId",
          attemptCount: { $sum: 1 },
          lastScore: { $last: "$score" },
        },
      },
    ]);

    // Get all tests
    const allTests = await Test.find({}).lean();

    // Prepare response with reattempt eligibility
    const response = allTests.map((test) => {
      const attemptData = userAttempts.find((a) => a._id.equals(test._id));
      const attempts = attemptData?.attemptCount || 0;

      return {
        ...test,
        attemptCount: attempts,
        lastScore: attemptData?.lastScore || 0,
        canReattempt: attempts < DEFAULT_MAX_ATTEMPTS,
      };
    });

    // Filter to only return tests that can be reattempted
    const reattemptableTests = response.filter((test) => test.canReattempt);

    res.json(reattemptableTests);
  } catch (error) {
    console.error("Get reattemptable tests failed:", error);
    res.status(500).json({
      message: "Failed to get reattemptable tests",
      error: error.message,
    });
  }
};
exports.reattemptTest = async (req, res) => {
  try {
    const { testId } = req.params;
    const userId = req.user.userId;
    const DEFAULT_MAX_ATTEMPTS = 3;

    // Verify test exists
    const test = await Test.findById(testId);
    if (!test) {
      return res.status(404).json({ message: "Test not found" });
    }

    // Count existing attempts
    const attemptCount = await Result.countDocuments({
      userId: userId,
      testId: testId,
    });

    // Check max attempts
    if (attemptCount >= DEFAULT_MAX_ATTEMPTS) {
      return res.status(403).json({
        message: "Maximum attempts reached",
        maxAttempts: DEFAULT_MAX_ATTEMPTS,
        attemptCount,
      });
    }

    // Create new test session
    const session = new TestSession({
      userId,
      testId,
      status: "active",
      startTime: new Date(),
      endTime: new Date(Date.now() + test.duration * 60 * 1000),
    });
    await session.save();

    res.json({
      success: true,
      message: "Reattempt approved",
      sessionId: session._id,
      testId: test._id,
      attemptNumber: attemptCount + 1,
    });
  } catch (error) {
    console.error("Reattempt error:", error);
    res.status(500).json({
      message: "Failed to process reattempt",
      error: error.message,
    });
  }
};
module.exports = {
  getTests: exports.getTests,
  getTest: exports.getTest,
  createTest: exports.createTest,
  updateTest: exports.updateTest,
  deleteTest: exports.deleteTest,
  updatePdfSettings: exports.updatePdfSettings,
  getPdf: exports.getPdf,
  uploadTest: exports.uploadTest,
  bulkUploadQuestions: exports.bulkUploadQuestions,
  getAvailableTests: exports.getAvailableTests,
  startTest: exports.startTest,
  submitTest: exports.submitTest,
  getTestResult: exports.getTestResult,
  streamTestResult: exports.streamTestResult,
  getReattemptableTests: exports.getReattemptableTests,
  reattemptTest: exports.reattemptTest,
};
