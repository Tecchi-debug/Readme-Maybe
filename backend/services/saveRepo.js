const mongoose = require('mongoose');
const StoredRepo = require('../models/StoredRepo');

const saveRepo = async (repoData) => {
    const {
        UserId,
        FullName
    } = repoData;

    const userObjectId = new mongoose.Types.ObjectId(UserId);

    const updatedRepo = await StoredRepo.findOneAndUpdate(
        {
            UserId: userObjectId,
            //sFullName: FullName
        },
        {
            $set: {
                ...repoData,
                UserId: userObjectId,
                UpdatedAt: new Date()
            }
        },
        {
            new: true,      // return updated doc
            upsert: true    // create if not exists
        }
    );

    return updatedRepo;
};

module.exports = saveRepo;