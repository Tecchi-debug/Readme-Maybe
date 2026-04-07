const express = require('express');
const router = express.Router();
const analyzeRepoController = require('../controllers/analyzeRepoController');
const checkDifferenceController = require('../controllers/commitDifferenceController');
const analyzeFileContentsController = require('../controllers/analyzeRepoController');


router.post('/analyze',analyzeRepoController);
router.post('/difference',checkDifferenceController);
router.post('/contents',analyzeFileContentsController);

module.exports = router;