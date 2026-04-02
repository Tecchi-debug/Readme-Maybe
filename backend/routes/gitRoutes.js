const express = require('express');
const router = express.Router();
const analyzeRepoController = require('../controllers/analyzeRepoController');
const checkDifferenceController = require('../controllers/commitDifferenceController');


/*router.post('/difference', async (req, res) => {
    req.body = {
        repoUrl: "https://github.com/Tecchi-debug/Readme-Maybe.git"
    };

    return checkDifferenceController(req, res);
});*/

router.post('/analyze',analyzeRepoController);
//router.post('/difference',checkDifferenceController);

module.exports = router;