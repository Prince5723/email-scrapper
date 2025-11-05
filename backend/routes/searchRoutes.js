const express = require('express');
const router = express.Router();
const searchController = require('../controllers/searchController');

// POST /api/search - Search for emails
router.post('/search', searchController.searchEmails);

// GET /api/history - Get search history
router.get('/history', searchController.getHistory);

// GET /api/stats - Get statistics
router.get('/stats', searchController.getStats);

module.exports = router;

