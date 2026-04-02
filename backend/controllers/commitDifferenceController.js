const checkDifference = require("../services/commitDifference");


const checkDifferenceController = async(req,res) => {
    try{
        const { repoUrl } = req.body;
        const result = await checkDifference(repoUrl);
        res.status(200).json(result);
    }catch(error){
        res.status(500).json({
            error:error.message
        });
    }

}

module.exports = checkDifferenceController;