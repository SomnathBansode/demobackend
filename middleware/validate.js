const { body, param, validationResult } = require('express-validator');
const Test = require('../models/Test');
const TestSession = require('../models/TestSession');

const validateCreateTest = [
    body('title.en').notEmpty().withMessage('English title is required'),
    body('title.mr').notEmpty().withMessage('Marathi title is required'),
    body('description.en').optional().isString().withMessage('English description must be a string'),
    body('description.mr').optional().isString().withMessage('Marathi description must be a string'),
    body('totalMarks').isInt({ min: 1 }).withMessage('Total marks must be a positive integer'),
    body('duration').isInt({ min: 1 }).withMessage('Duration must be a positive integer'),
    body('questions').isArray().withMessage('Questions must be an array'),
    body('questions.*.questionText.en').notEmpty().withMessage('English question text is required'),
    body('questions.*.questionText.mr').notEmpty().withMessage('Marathi question text is required'),
    body('questions.*.options').isArray({ min: 4, max: 4 }).withMessage('Each question must have exactly 4 options'),
    body('questions.*.options.*.en').notEmpty().withMessage('English option text is required'),
    body('questions.*.options.*.mr').notEmpty().withMessage('Marathi option text is required'),
    body('questions.*.correctAnswer').isInt({ min: 0, max: 3 }).withMessage('Correct answer must be between 0 and 3'),
    body('questions.*.marks').optional().isInt({ min: 1 }).withMessage('Marks must be a positive integer'),
];

const validateStartTest = [
    param('testId').isMongoId().withMessage('Invalid test ID'),
];

const validateSubmitTest = [
    param('testId').isMongoId().withMessage('Invalid test ID'),
    body('sessionId').isMongoId().withMessage('Invalid session ID'),
    body('answers').isArray().withMessage('Answers must be an array'),
    body('answers.*.questionIndex').isInt({ min: 0 }).withMessage('Invalid question index'),
    body('answers.*.selectedOption')
        .custom((value) => {
            // Allow -1 for unanswered, or 0-3 for valid options
            if (typeof value !== 'number' || (value < 0 && value !== -1) || value > 3) {
                throw new Error('Invalid selected option');
            }
            return true;
        })
        .optional({ nullable: true })
        .withMessage('Invalid selected option'),
    body('answers').custom(async (answers, { req }) => {
        const test = await Test.findById(req.params.testId);
        if (!test) {
            throw new Error('Test not found');
        }
        if (answers.length > test.questions.length) {
            throw new Error('Answers array exceeds the number of questions in the test');
        }
        return true;
    }),
    body('sessionId').custom(async (sessionId, { req }) => {
        const session = await TestSession.findOne({
            _id: sessionId,
            userId: req.user.userId,
            testId: req.params.testId,
            status: 'active',
        });
        if (!session) {
            throw new Error('No active test session found');
        }
        return true;
    }),
];

const validateGetTestResult = [
    param('testId').isMongoId().withMessage('Invalid test ID'),
];

const validateGetPdf = [
    param('testId').isMongoId().withMessage('Invalid test ID'),
];

const validateRequest = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation error',
            errors: errors.array()
        });
    }
    next();
};

module.exports = {
    validateCreateTest,
    validateStartTest,
    validateSubmitTest,
    validateGetTestResult,
    validateGetPdf,
    validateRequest,
};
