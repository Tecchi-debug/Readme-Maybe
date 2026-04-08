const express = require('express');
const router = express.Router();
const analyzeRepoController = require('../controllers/analyzeRepoController');
const checkDifferenceController = require('../controllers/commitDifferenceController');
const analyzeFileContentsController = require('../controllers/fileContentsController');
const { getUserRepos, deleteRepo } = require('../controllers/repoController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/analyze', analyzeRepoController);
router.post('/difference', checkDifferenceController);
router.post('/contents', analyzeFileContentsController);
router.get('/api/repos', authMiddleware.authMiddleware, getUserRepos);
router.delete('/api/repos/:id', authMiddleware.authMiddleware, deleteRepo);

module.exports = router;