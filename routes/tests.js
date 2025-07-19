const express = require('express');
const router = express.Router();
const testController = require('../controllers/testController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { validateCreateTest, validateStartTest, validateSubmitTest, validateGetTestResult, validateGetPdf, validateRequest } = require('../middleware/validate');
const multer = require('multer');


const upload = multer();

const uploadCsv = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }
        next();
    } catch (error) {
        console.error('CSV upload error:', error);
        res.status(500).json({ message: 'CSV upload failed', error: error.message });
    }
};

router.get('/', authMiddleware, testController.getTests);
router.get('/available', authMiddleware, testController.getAvailableTests);
router.get('/:testId', authMiddleware, testController.getTest);
router.post('/', authMiddleware, adminMiddleware, validateCreateTest, validateRequest, testController.createTest);
router.put('/:testId', authMiddleware, adminMiddleware, validateCreateTest, validateRequest, testController.updateTest);
router.delete('/:testId', authMiddleware, adminMiddleware, testController.deleteTest);
router.put('/:testId/pdf-settings', authMiddleware, adminMiddleware, testController.updatePdfSettings);
router.get('/:testId/pdf', authMiddleware, validateGetPdf, validateRequest, testController.getPdf);
router.post('/:testId/pdf', authMiddleware, adminMiddleware, upload.single('file'), testController.uploadTest);
router.post('/:testId/questions/bulk', authMiddleware, adminMiddleware, upload.single('file'), uploadCsv, testController.bulkUploadQuestions);
router.post('/:testId/start', authMiddleware, validateStartTest, validateRequest, testController.startTest);
router.post('/:testId/submit', authMiddleware, validateSubmitTest, validateRequest, testController.submitTest);
router.get('/:testId/result', authMiddleware, validateGetTestResult, validateRequest, testController.getTestResult);
router.get('/:testId/result/stream', authMiddleware, validateGetTestResult, validateRequest, testController.streamTestResult);
router.get('/reattempt/available', authMiddleware, testController.getReattemptableTests);
router.post('/:testId/reattempt', authMiddleware, testController.reattemptTest);

module.exports = router;