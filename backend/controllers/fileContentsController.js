const analyzeFileContents = require('../services/fileContents');

const analyzeFileContentsController = async(req,res) => {
    try {
        const { repoUrl } = req.body;
        const { importantFiles } = req.body;
        const result = await analyzeFileContents(repoUrl,importantFiles);
        res.status(200).json(result)
    }catch(error){
        res.status(500).json({
            error:error.message
        });
    }
};

module.exports = analyzeFileContentsController;