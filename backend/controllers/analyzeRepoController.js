const analyzeUrl = require('../services/analyzerepo');

const analyzeRepoController = async(req,res) => {
    try{

        const { repoUrl } = req.body;
        const { userId } = req.body;
        //console.log(req.body);
        const result = await analyzeUrl(repoUrl,userId);
        res.status(200).json(result);
    } catch(error){
        res.status(500).json({
            error:error.message
        });
    }
   

};

module.exports = analyzeRepoController;