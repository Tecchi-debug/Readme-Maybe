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
    let readmeStatus = "missing";
    let readmeFailureReason = "No README file was found on the repository default branch.";

    if (readmeRes.ok) {
        const readmeData = await readmeRes.json();
        readmePath = readmeData.path || "";

        if (readmeData.content) {
            readmeText = Buffer.from(readmeData.content, "base64").toString("utf8");
        }

        if (readmeText.trim()) {
            readmeStatus = "found";
            readmeFailureReason = "";
        } else {
            readmeStatus = "empty";
            readmeFailureReason = "A README file exists, but GitHub returned no readable content for it.";
        }
    } else if (readmeRes.status !== 404) {
        const errorText = await readmeRes.text();
        readmeStatus = "error";
        readmeFailureReason = `GitHub README lookup failed: ${readmeRes.status}${errorText ? ` ${errorText}` : ""}`;
    }

    const tree = treeData.tree || [];

    const folders = tree
        .filter((item) => item.type === "tree")
        .map((item) => item.path);

    // -------------------------------------------------------------------------
    // importantFiles: four-tier selection to give the LLM enough real code
    // to avoid hallucinating. Capped at 30 files total.
    //
    //   Tier A — config/manifest files (dependencies, build, docs)
    //   Tier B — conventional language entry points
    //   Tier C — source files for the primary language (by byte count)
    //   Tier D — source files for the secondary language, capped small
    //
    // If everything comes up dry, we fall back to the shallowest 10 blobs
    // so the model at least gets *something* to read.
    // -------------------------------------------------------------------------

    const CONFIG_MANIFEST_BASENAMES = new Set([
        "README.md", "README", "README.rst", "README.txt",
        "LICENSE", "LICENSE.md", "LICENSE.txt",
        "package.json", "package-lock.json", "yarn.lock", "pnpm-lock.yaml",
        "requirements.txt", "pyproject.toml", "setup.cfg", "Pipfile", "Pipfile.lock", ".python-version",
        "pom.xml", "build.gradle", "build.gradle.kts", "settings.gradle",
        "go.mod", "go.sum",
        "Cargo.toml", "Cargo.lock",
        "Gemfile", "Gemfile.lock",
        "composer.json", "composer.lock",
        "Makefile",
        "Dockerfile", "docker-compose.yml", "docker-compose.yaml",
        "next.config.js", "next.config.ts", "next.config.mjs",
        "vite.config.js", "vite.config.ts",
        "tsconfig.json", "jsconfig.json",
        ".env.example", ".env.sample",
    ]);

    const ENTRY_POINT_BASENAMES = new Set([
        "main.py", "__main__.py", "app.py", "setup.py", "manage.py",
        "index.js", "index.ts", "index.mjs", "index.jsx", "index.tsx",
        "server.js", "server.ts",
        "main.go",
        "main.rs",
        "App.jsx", "App.tsx",
    ]);

    const ENTRY_POINT_PATH_SUFFIXES = [
        "src/index.js", "src/index.ts", "src/index.jsx", "src/index.tsx",
        "src/main.js", "src/main.ts", "src/main.rs",
    ];

    // Map GitHub language name → source-file extensions (lowercased, with dot)
    const LANGUAGE_EXTENSIONS = {
        Python: [".py"],
        JavaScript: [".js", ".jsx", ".mjs", ".cjs"],
        TypeScript: [".ts", ".tsx"],
        Go: [".go"],
        Rust: [".rs"],
        Java: [".java"],
        Kotlin: [".kt", ".kts"],
        Ruby: [".rb"],
        PHP: [".php"],
        "C++": [".cpp", ".cc", ".cxx", ".hpp", ".hh", ".h"],
        C: [".c", ".h"],
        "C#": [".cs"],
        Swift: [".swift"],
        Scala: [".scala"],
        Shell: [".sh"],
    };

    const IGNORED_PATH_SEGMENTS = [
        "/node_modules/", "/dist/", "/build/", "/.venv/", "/venv/",
        "/vendor/", "/__pycache__/", "/target/", "/.next/", "/coverage/",
        "/.git/", "/.pytest_cache/", "/.mypy_cache/", "/.tox/",
    ];

    const isIgnoredPath = (p) => {
        const paddedPath = `/${p}`;
        if (IGNORED_PATH_SEGMENTS.some((seg) => paddedPath.includes(seg))) return true;
        const base = p.split("/").pop();
        if (/\.min\.(js|css|mjs)$/i.test(base)) return true;
        // Test file conventions: *.test.js, *.spec.ts, foo_test.go, test_foo.py
        if (/\.(test|spec)\.[a-z]+$/i.test(base)) return true;
        if (/_test\.[a-z]+$/i.test(base)) return true;
        if (/^test_.*\.[a-z]+$/i.test(base)) return true;
        return false;
    };

    // All blob paths from the tree
    const blobPaths = tree
        .filter((item) => item.type === "blob")
        .map((item) => item.path);

    // Ranking: shallowest first → shortest path → alphabetical
    const rankPaths = (paths) =>
        [...paths].sort((a, b) => {
            const depthA = (a.match(/\//g) || []).length;
            const depthB = (b.match(/\//g) || []).length;
            if (depthA !== depthB) return depthA - depthB;
            if (a.length !== b.length) return a.length - b.length;
            return a.localeCompare(b);
        });

    // ---- Tier A: config/manifest by basename ----
    const tierA = blobPaths.filter((p) => CONFIG_MANIFEST_BASENAMES.has(p.split("/").pop()));

    // ---- Tier B: entry points by basename or path suffix ----
    const tierB = blobPaths.filter((p) => {
        const base = p.split("/").pop();
        if (ENTRY_POINT_BASENAMES.has(base)) return true;
        if (ENTRY_POINT_PATH_SUFFIXES.some((suffix) => p === suffix || p.endsWith(`/${suffix}`))) return true;
        return false;
    });

    // Determine primary and secondary languages by byte count
    // (more reliable than repoMeta.language, which is a single string)
    const languagesByBytes = Object.entries(languagesData).sort((a, b) => b[1] - a[1]);
    const primaryLanguage = languagesByBytes[0]?.[0] || "";
    const secondaryLanguage = languagesByBytes[1]?.[0] || "";

    const sourceFilesForLanguage = (lang, cap) => {
        const exts = LANGUAGE_EXTENSIONS[lang];
        if (!exts || !exts.length) return [];
        const matches = blobPaths.filter((p) => {
            if (isIgnoredPath(p)) return false;
            const lower = p.toLowerCase();
            return exts.some((ext) => lower.endsWith(ext));
        });
        return rankPaths(matches).slice(0, cap);
    };

    // ---- Tier C: primary-language source files ----
    const tierC = sourceFilesForLanguage(primaryLanguage, 15);

    // ---- Tier D: secondary-language source files ----
    const tierD = sourceFilesForLanguage(secondaryLanguage, 5);

    // Merge tiers in priority order, dedupe, cap at 30
    const FILE_CAP = 30;
    const seen = new Set();
    const importantFiles = [];
    for (const tier of [tierA, tierB, tierC, tierD]) {
        for (const p of tier) {
            if (importantFiles.length >= FILE_CAP) break;
            if (seen.has(p)) continue;
            seen.add(p);
            importantFiles.push(p);
        }
        if (importantFiles.length >= FILE_CAP) break;
    }

    // Fallback: if we still have almost nothing, grab the shallowest blobs
    // of any type (minus ignored dirs) so the LLM has *something* to read.
    if (importantFiles.length < 3) {
        const fallback = rankPaths(blobPaths.filter((p) => !isIgnoredPath(p))).slice(0, 10);
        for (const p of fallback) {
            if (importantFiles.length >= FILE_CAP) break;
            if (seen.has(p)) continue;
            seen.add(p);
            importantFiles.push(p);
        }
    }

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
            readmeStatus,
            readmeFailureReason,
        },
        IsPrivate: repoMeta.private || false,
        LastIndexedAt: now,
        CreatedAt: now,
        UpdatedAt: now,
    };
};

module.exports = analyzeRepo;
