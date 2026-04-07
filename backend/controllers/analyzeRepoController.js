const analyzeUrl = require('../services/analyzerepo');
const analyzeFileContents = require('../services/fileContents');

const analyzeRepoController = async(req,res) => {
    try{

        const { repoUrl } = req.body;
        const { userId } = req.body;
        const result = await analyzeUrl(repoUrl,userId);
        res.status(200).json(result);
    } catch(error){
        res.status(500).json({
            error:error.message
        });
    }
   

};


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

module.exports = analyzeRepoController;
module.exports = analyzeFileContentsController;