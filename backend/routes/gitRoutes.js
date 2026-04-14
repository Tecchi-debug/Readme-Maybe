const express = require('express');
const router = express.Router();
const analyzeRepoController = require('../controllers/analyzeRepoController');
const checkDifferenceController = require('../controllers/commitDifferenceController');
const analyzeFileContentsController = require('../controllers/fileContentsController');
const { getUserRepos, deleteRepo, updateRepoReadme, createReadmePullRequest, getRepoVersions, restoreRepoVersion } = require('../controllers/repoController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/analyze', analyzeRepoController);
router.post('/difference', checkDifferenceController);
router.post('/contents', analyzeFileContentsController);
router.get('/api/repos', authMiddleware.authMiddleware, getUserRepos);
router.put('/api/repos/:id/readme', authMiddleware.authMiddleware, updateRepoReadme);
router.get('/api/repos/:id/versions', authMiddleware.authMiddleware, getRepoVersions);
router.post('/api/repos/:id/versions/:versionId/restore', authMiddleware.authMiddleware, restoreRepoVersion);
router.post('/api/repos/:id/readme-pr', authMiddleware.authMiddleware, createReadmePullRequest);
router.delete('/api/repos/:id', authMiddleware.authMiddleware, deleteRepo);

module.exports = router;
