// This is the StoredRepo model, I don't think we have this in the backend yet
const StoredRepo = require("../models/StoredRepo.js");
const mongoose = require('mongoose');


const checkDifference = async(repoUrl, userId) => {

    if(!repoUrl){
        throw new Error("Error retrieving repository URL");
    }

    if(!userId){
        throw new Error("Error retrieving user ID");
    }

    const url = new URL(repoUrl);
    const parts = url.pathname.split("/").filter(Boolean);
    const owner = parts[0];
    const repo = parts[1].replace(/\.git$/, "");
    //const parsedUrl = url.hostname.replace(/\.git$/, "");
    const fullName = `${owner}/${repo}`;

    


    const existingRepo = await StoredRepo.findOne({
        UserId:new mongoose.Types.ObjectId(userId),
        FullName: fullName
    });


    if(!existingRepo){
        throw new Error("You haven't generated a readME for this repo yet");
    }



    const headers = {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    };


    const defaultBranch = existingRepo.DefaultBranch;
    const pastSha = existingRepo.Sha;
    const branchUrl = `https://api.github.com/repos/${owner}/${repo}/branches/${defaultBranch}`;

    const branchRes = await fetch(branchUrl,{
        method:"GET",
        headers
    });

    if(!branchRes.ok){
        throw new Error("Error fetching branch details");
    }

    const branchData = await branchRes.json();

    const currentSha = branchData.commit?.sha || "";
    
    const differenceUrl = `https://api.github.com/repos/${owner}/${repo}/compare/${pastSha}...${currentSha}`;

    const differenceRes = await fetch(differenceUrl,{
        method:"GET",
        headers
    });

    if(!differenceRes.ok){
        throw new Error("Error fetching commit differences");
    }

    const differenceData = await differenceRes.json();

    const differenceStatus = differenceData.status;
    const ahead = differenceData.ahead_by;
    const behind = differenceData.behind_by;
    const total_commits = differenceData.total_commits;
    const commits = differenceData.commits;
    const files = differenceData.files;

    return{
        differenceStatus,
        ahead,
        behind,
        total_commits,
        commits,
        files
    }

    
};

module.exports = checkDifference;