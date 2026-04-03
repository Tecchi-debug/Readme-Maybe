const analyzeUrl = require('../services/analyzerepo');
const StoredRepo = require('../models/StoredRepo');

const analyzeRepoController = async(req,res) => {
    try{

        const { repoUrl } = req.body;
        const { userId } = req.body;
        const result = await analyzeUrl(repoUrl,userId);

        const existingRepo = await StoredRepo.findOne({
            UserId: result.UserId,
            FullName: result.FullName
        });

        if (existingRepo && existingRepo.Sha === result.Sha) {
            console.log(`[analyze] No differences for ${result.FullName} (sha ${result.Sha})`);
            return res.status(200).json(existingRepo);
        }

        let savedRepo;

        if (existingRepo) {
            result.CreatedAt = existingRepo.CreatedAt;
            savedRepo = await StoredRepo.findByIdAndUpdate(
                existingRepo._id,
                { $set: result },
                { new: true, runValidators: true }
            );
        } else {
            savedRepo = await StoredRepo.create(result);
        }

        res.status(200).json(savedRepo);
    } catch(error){
        res.status(500).json({
            error:error.message
        });
    }
   

};

module.exports = analyzeRepoController;