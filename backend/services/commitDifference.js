// This is the StoredRepo model, I don't think we have this in the backend yet
const StoredRepo = require("../models/storedRepo.js");


// Will find the StoredRepo in MongoDB, and compare that commit to the latest commit used to
// regenerate the new README
const checkDifference = async(repoUrl,userId) => {
    try{
        if(!repoUrl){
            throw new Error("Error loading URL");
        }



        const existingRepo = await StoredRepo.findOne({
            UserId: userId,
            FullName
        })

    }catch(error){
        return{
            error
        }
    }
}