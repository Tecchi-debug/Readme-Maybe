const express = require('express');
const router = express.Router();

const readmeController = require('../controllers/readmeController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/generate', authMiddleware.authMiddleware, readmeController);

module.exports = router;
