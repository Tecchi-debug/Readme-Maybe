// Take in a URL extract the needed parts for the GitHub API, call two APIS that will return us all the information needed for the LLM 

const analyzeUrl = async(repoUrl) => {

    if(!repoUrl){
        throw new Error("repoUrl is required");
    }

    // Extract the parts that we need from the URL e.g. owner name and repo name
    const newRepoUrl = new URL(repoUrl);
    const parts = newRepoUrl.pathname.split("/").filter(Boolean);
    
    if(parts.length < 2){
        throw new Error("Invalid GitHub repo URL");
    }

   
    const owner = parts[0];
    // Reg Ex to remove the .git from the repo name
    const repo = parts[1].replace(/\.git$/,"");

    const headers = {
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2026-03-10'
    };

    // General Meta Data on the Repo, only call this API to retrieve the default branch
    const repoMetaUrl = `https://api.github.com/repos/${owner}/${repo}`;
    const repoMetaRes = await fetch(repoMetaUrl,{
        method:"GET",
        headers
    });


    if(!repoMetaRes.ok){
        throw new Error(`Failed to fetch repo metadata: ${repoMetaRes.status}`);
    }
    
    // Turn meta data into json and retrieve the default branch.
    const repoMeta = await repoMetaRes.json();
    const branch = repoMeta.default_branch;


    // Languages API only needs owner and repo name
    // treeUrl needs repo name, owner, and the default branch so it can recursively traverse throught that branch
    const languagesUrl = `https://api.github.com/repos/${owner}/${repo}/languages`;
    const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;
    
    // Call both APIS and save result in variable
    const[languagesRes,treeRes] = await Promise.all([
        fetch(languagesUrl,{method:"GET",headers}),
        fetch(treeUrl,{method:"GET",headers}),
    ]);

    if(!languagesRes.ok){
        throw new Error(`Failed to fetch languages: ${languagesRes.status}`);
    }

    if(!treeRes.ok){
        throw new Error(`Failed to fetch repo tree info: ${treeRes.status}`);
    }
    // Turn result into JSON and extract the recursive data from treeData with .tree
   const languageData = await languagesRes.json();
   const treeData = await treeRes.json();
   const tree = treeData.tree;
   
   // The result from the languages API is just a JSON object with an array of all the languages
   // Just extract the keys which are the languages themselves.
   const languages = Object.keys(languageData);


   // To get all the folders that occur in the branch we filter by item type,
   // all folders have item type ==== "tree", save the path of those items to our array
   const folders = tree.filter((item) => item.type === "tree")
   .map((item) => item.path);

    // Some important files chatGPT told me to check
   const importantFileNames = new Set([
    "README.md",
    "package.json",
    "requirements.txt",
    "pyproject.toml",
    "pom.xml",
    "build.gradle",
    "Dockerfile",
    "next.config.js",
    "vite.config.js",
    ]);

    // Look through tree, all files have type === "blob",
    // split by "/", we don't want the whole file path just the actual file name which will be last 
    // within the path, pop that off and check if it's in our list
    const importantFiles = tree
        .filter((item) => item.type === "blob")
        .map((item) => item.path)
        .filter((filePath) => {
            const fileName = filePath.split("/").pop();
            return importantFileNames.has(fileName);
        });
   

    // Return JSON of Repo Info
    return {
        languages,
        repo,
        owner,
        folders,
        importantFiles
    }
}
   
    


module.exports = analyzeUrl;