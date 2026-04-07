const analyzeUrl = require('../services/analyzerepo');

const saveRepo = require('../services/saveRepo');

const analyzeRepoController = async(req,res) => {
    try{

        const { repoUrl } = req.body;
        const { userId } = req.body;
        const repoData = await analyzeUrl(repoUrl,userId);
        const saveRepoData = await saveRepo(repoData);
        res.status(200).json(saveRepoData);
    } catch(error){
        res.status(500).json({
            error:error.message
        });
    }
   

};



module.exports = analyzeRepoController;
