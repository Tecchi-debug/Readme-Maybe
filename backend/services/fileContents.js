// Fetch the contents of a list of files from a GitHub repo.
// Returns a partial-success envelope so a single missing/unreachable file
// doesn't break the whole README generation pipeline.
//
// Return shape:
//   {
//     fileContents: [ ...successful GitHub file objects ],
//     failed:       [ { path, status, reason } ],
//     requestedCount: number,
//     successCount:   number
//   }
//
// Throws only if NOTHING could be fetched (every file failed) or if the
// inputs themselves are invalid — callers treat a thrown error as fatal.

const { getGithubToken } = require('./secretsManager');

const analyzeFileContents = async (repoUrl, importantFiles) => {
    if (!importantFiles || !Array.isArray(importantFiles) || importantFiles.length === 0) {
        throw new Error("File array is empty, no important files found");
    }

    if (!repoUrl) {
        throw new Error("Repository URL is empty");
    }

    const parsedUrl = new URL(repoUrl);
    const parts = parsedUrl.pathname.split("/").filter(Boolean);
    if (parts.length < 2) {
        throw new Error("Invalid URL");
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

    const fileContents = [];
    const failed = [];

    for (let i = 0; i < importantFiles.length; i++) {
        const filePath = importantFiles[i];
        const fileApiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURI(filePath)}`;

        try {
            const res = await fetch(fileApiUrl, {
                method: "GET",
                headers,
            });

            if (!res.ok) {
                const errorText = await res.text().catch(() => "");
                failed.push({
                    path: filePath,
                    status: res.status,
                    reason: errorText || res.statusText || "fetch failed",
                });
                continue;
            }

            const fileData = await res.json();

            // GitHub returns an array for directories — skip those
            if (Array.isArray(fileData)) {
                failed.push({
                    path: filePath,
                    status: 200,
                    reason: "path is a directory, not a file",
                });
                continue;
            }

            const encodedFileContent = fileData.content;
            if (typeof encodedFileContent !== "string") {
                failed.push({
                    path: filePath,
                    status: 200,
                    reason: "no content field on GitHub response (binary or too large)",
                });
                continue;
            }

            fileData.content = Buffer.from(encodedFileContent, "base64").toString("utf-8");
            fileContents.push(fileData);
        } catch (err) {
            failed.push({
                path: filePath,
                status: 0,
                reason: err?.message || "unknown fetch error",
            });
        }
    }

    const requestedCount = importantFiles.length;
    const successCount = fileContents.length;

    // Only throw when literally nothing came back — otherwise callers
    // should see partial success and decide what to do with `failed`.
    if (successCount === 0) {
        throw new Error(
            `Failed to fetch any of the ${requestedCount} requested files from GitHub`
        );
    }

    return {
        fileContents,
        failed,
        requestedCount,
        successCount,
    };
};

module.exports = analyzeFileContents;