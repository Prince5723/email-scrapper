const express = require('express');
const router = express.Router();
const testController = require('../controllers/testController');

// GET /api/test/email-extraction - Test email extraction
router.get('/email-extraction', testController.testEmailExtraction);

// POST /api/test/mock-search - Test with mock data
router.post('/mock-search', testController.testMockSearch);

// GET /api/test/name-inference - Test name inference
router.get('/name-inference', testController.testNameInference);

module.exports = router;

