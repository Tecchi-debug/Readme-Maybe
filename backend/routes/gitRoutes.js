const express = require('express');
const router = express.Router();
const analyzeRepoController = require('../controllers/analyzeRepoController');

router.post('/analyze', async (req, res) => {
    req.body = {
        repoUrl: "https://github.com/Tecchi-debug/Readme-Maybe.git"
    };

    return analyzeRepoController(req, res);
});

module.exports = router;