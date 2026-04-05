const express = require('express');
const router = express.Router();
const analyzeRepoController = require('../controllers/analyzeRepoController');
const checkDifferenceController = require('../controllers/commitDifferenceController');


router.post('/analyze',analyzeRepoController);
router.post('/difference',checkDifferenceController);

module.exports = router;