const express = require('express');
const router = express.Router();

const readmeController = require('../controllers/readmeController');

router.post('/generate', readmeController);

module.exports = router;
