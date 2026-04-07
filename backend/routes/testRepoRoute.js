const express = require('express');
const router = express.Router();
const analyzeUrl = require('../services/analyzerepo');

router.get('/test', async (req, res) => {
    try {
      const testUrl = "https://github.com/Tecchi-debug/Readme-Maybe.git";
  
      const data = await analyzeUrl(testUrl);
  
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });


  module.exports = router;