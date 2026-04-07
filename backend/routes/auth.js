const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/github', authController.githubStart);
router.get('/github/callback', authController.githubCallback);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.get('/me', authMiddleware.authMiddleware, authController.me);
router.get('/github/repos', authMiddleware.authMiddleware, authController.githubRepos);

module.exports = router;
