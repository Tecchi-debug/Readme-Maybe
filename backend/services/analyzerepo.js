// Take in a URL extract the needed parts for the GitHub API, call 5 APIS that will return us all the information needed for the LLM 

const { getGithubToken } = require('./secretsManager');


const analyzeRepo = async (repoUrl, userId) => {
    if (!repoUrl) {
        throw new Error("repoUrl is required");
    }

    if (!userId) {
        throw new Error("userId is required");
    }

    // Split the URL into the parts that we need: owner, repo 
    const parsedUrl = new URL(repoUrl);
    const parts = parsedUrl.pathname.split("/").filter(Boolean);

    if (parts.length < 2) {
        throw new Error("Invalid GitHub repo URL");
    }

    const owner = parts[0];
    const repo = parts[1].replace(/\.git$/, "");

    const headers = {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    };

    const githubToken = getGithubToken();
    if (githubToken) {
        headers.Authorization = `Bearer ${githubToken}`;
    }

    const repoMetaUrl = `https://api.github.com/repos/${owner}/${repo}`;
    const repoMetaRes = await fetch(repoMetaUrl, {
        method: "GET",
        headers,
    });

    if (!repoMetaRes.ok) {
        const errorText = await repoMetaRes.text();
        throw new Error(`Failed to fetch repo metadata: ${repoMetaRes.status} ${errorText}`);
    }

    // Gets the meta data of repo
    const repoMeta = await repoMetaRes.json();

    const defaultBranch = repoMeta.default_branch || "main";

    const languagesUrl = `https://api.github.com/repos/${owner}/${repo}/languages`;
    const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`;
    const readmeUrl = `https://api.github.com/repos/${owner}/${repo}/readme`;
    const branchUrl = `https://api.github.com/repos/${owner}/${repo}/branches/${defaultBranch}`;

    const [languagesRes, treeRes, readmeRes, branchRes] = await Promise.all([
        fetch(languagesUrl, { method: "GET", headers }),
        fetch(treeUrl, { method: "GET", headers }),
        fetch(readmeUrl, { method: "GET", headers }),
        fetch(branchUrl, { method: "GET", headers }),
    ]);

    if (!languagesRes.ok) {
        const errorText = await languagesRes.text();
        throw new Error(`Failed to fetch languages: ${languagesRes.status} ${errorText}`);
    }

    if (!treeRes.ok) {
        const errorText = await treeRes.text();
        throw new Error(`Failed to fetch tree: ${treeRes.status} ${errorText}`);
    }

    if (!branchRes.ok) {
        const errorText = await branchRes.text();
        throw new Error(`Failed to fetch branch info: ${branchRes.status} ${errorText}`);
    }

    const languagesData = await languagesRes.json();
    const treeData = await treeRes.json();
    const branchData = await branchRes.json();

    let readmeText = "";
    let readmePath = "";

    if (readmeRes.ok) {
        const readmeData = await readmeRes.json();
        readmePath = readmeData.path || "";

        if (readmeData.content) {
            readmeText = Buffer.from(readmeData.content, "base64").toString("utf8");
        }
    }

    const tree = treeData.tree || [];

    const folders = tree
        .filter((item) => item.type === "tree")
        .map((item) => item.path);

    const importantFileNames = new Set([
        "README.md",
        "README",
        "package.json",
        "package-lock.json",
        "requirements.txt",
        "pyproject.toml",
        "pom.xml",
        "build.gradle",
        "Dockerfile",
        "docker-compose.yml",
        "next.config.js",
        "next.config.ts",
        "vite.config.js",
        "vite.config.ts",
        "tsconfig.json",
        ".env.example",
    ]);

    const importantFiles = tree
        .filter((item) => item.type === "blob")
        .map((item) => item.path)
        .filter((filePath) => {
            const fileName = filePath.split("/").pop();
            return importantFileNames.has(fileName);
        });

    const languages = Object.keys(languagesData);
    const latestSha = branchData.commit?.sha || "";

    const fullName = `${owner}/${repo}`;
    const diffFileApiUrl = latestSha
        ? `https://api.github.com/repos/${owner}/${repo}/compare/${latestSha}...${defaultBranch}`
        : "";

    const now = new Date();

    return {
        UserId: userId,
        Provider: "github",
        Owner: owner,
        Name: repo,
        FullName: fullName,
        RemoteUrl: repoMeta.html_url || repoUrl,
        DefaultBranch: defaultBranch,
        Readme: readmeText,
        ReadmePath: readmePath,
        Sha: latestSha,
        DiffFileApiUrl: diffFileApiUrl,
        Metadata: {
            description: repoMeta.description || "",
            homepage: repoMeta.homepage || "",
            language: repoMeta.language || "",
            languages,
            folders,
            importantFiles,
            stars: repoMeta.stargazers_count || 0,
            forks: repoMeta.forks_count || 0,
            openIssues: repoMeta.open_issues_count || 0,
            watchers: repoMeta.watchers_count || 0,
            size: repoMeta.size || 0,
            topics: repoMeta.topics || [],
            isFork: repoMeta.fork || false,
            repoCreatedAt: repoMeta.created_at || null,
            repoUpdatedAt: repoMeta.updated_at || null,
            repoPushedAt: repoMeta.pushed_at || null,
        },
        IsPrivate: repoMeta.private || false,
        LastIndexedAt: now,
        CreatedAt: now,
        UpdatedAt: now,
    };
};

module.exports = analyzeRepo;

