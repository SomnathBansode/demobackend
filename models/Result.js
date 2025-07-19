const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    testId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Test',
        required: true,
    },
    score: {
        type: Number,
        required: true,
    },
    answers: [
        {
            questionIndex: {
                type: Number,
                required: true,
            },
            selectedOption: {
                type: Number,
                required: true,
            },
            correctAnswer: {
                type: Number,
            },
            isCorrect: {
                type: Boolean,
                required: true,
            },
        },
    ],
    correctAnswers: { type: Number, required: true },
    incorrectAnswers: { type: Number, required: true },
    unanswered: { type: Number, required: true },
    attemptNumber: { type: Number, required: true },
    submittedAt: {
        type: Date,
        default: Date.now,
    },
},{timestamps:true});

resultSchema.index({ testId: 1, userId: 1 });

module.exports = mongoose.model('Result', resultSchema);