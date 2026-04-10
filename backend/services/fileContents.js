

const analyzeFileContents = async (repoUrl,importantFiles) => {
    if (!importantFiles){
        throw new Error("File array is empty, no important files found");
    }

    if(!repoUrl){
        throw new Error("Repository URL is empty");
    }

    const parsedUrl = new URL(repoUrl);
    const parts = parsedUrl.pathname.split("/").filter(Boolean);
    if(!parts){
        throw new Error("Invalid URL");
    }


    const owner = parts[0];
    const repo = parts[1].replace(/\.git$/, "");


    const headers = {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    };

    let filePath = "";
    const fileContents = [];
    

    for (let i = 0; i < importantFiles.length; i++){
        filePath = importantFiles[i];
        let fileApiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;

        const res = await fetch(fileApiUrl,{
            method: "GET",
            headers
        });
       

        if(!res.ok){
            throw new Error("Error retrieving contents of files");
        }

        const fileData = await res.json();
        const encodedFileContent = fileData.content;
        const decodedFileContent = Buffer.from(encodedFileContent,"base64").toString("utf-8");
        fileData.content = decodedFileContent;


        fileContents.push(fileData);

    }




    return{
        fileContents
    };


    



}


module.exports = analyzeFileContents;