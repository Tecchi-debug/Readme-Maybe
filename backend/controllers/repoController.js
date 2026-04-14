const StoredRepo = require('../models/StoredRepo');
const OAuthAccount = require('../models/OAuthAccount');
const ReadmeVersion = require('../models/ReadmeVersion');
const { createReadmeVersionSnapshot } = require('../services/readmeVersioning');

const GITHUB_API_BASE = 'https://api.github.com';

async function githubRequest({ token, path, method = 'GET', body }) {
    const response = await fetch(`${GITHUB_API_BASE}${path}`, {
        method,
        headers: {
            Accept: 'application/vnd.github+json',
            Authorization: `Bearer ${token}`,
            'X-GitHub-Api-Version': '2022-11-28',
            ...(body ? { 'Content-Type': 'application/json' } : {})
        },
        ...(body ? { body: JSON.stringify(body) } : {})
    });

    const raw = await response.text();
    let parsed = null;

    if (raw) {
        try {
            parsed = JSON.parse(raw);
        } catch {
            parsed = raw;
        }
    }

    if (!response.ok) {
        const message = typeof parsed === 'object' && parsed && 'message' in parsed
            ? parsed.message
            : raw || `GitHub request failed with ${response.status}`;
        throw new Error(`${response.status} ${message}`);
    }

    return parsed;
}

// -------------------------------------------------------------------------
// getUserRepos
// GET /api/repos
// Returns all StoredRepo records for the authenticated user, sorted by
// most recently updated. Also computes summary stats for the dashboard.
// -------------------------------------------------------------------------
const getUserRepos = async (req, res) => {
    try {
        const userId = req.user.id;

        // Fetch all repos belonging to this user, newest first
        const repos = await StoredRepo.find({ UserId: userId })
            .sort({ UpdatedAt: -1 })
            .lean();

        // Stat calculations
        const totalReadmes = repos.filter((r) => r.Readme && r.Readme.trim() !== '').length;
        const totalRepos = repos.length;

        // Count repos touched in the last 7 days
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const thisWeekCount = repos.filter(
            (r) => new Date(r.UpdatedAt) >= oneWeekAgo
        ).length;

        res.status(200).json({
            repos,
            stats: {
                totalReadmes,
                totalRepos,
                thisWeekCount,
            },
        });
    } catch (error) {
        console.error('[getUserRepos] error:', error.message);
        res.status(500).json({ message: 'Server Error' });
    }
};

// -------------------------------------------------------------------------
// updateRepoReadme
// PUT /api/repos/:id/readme
// Updates the Readme field of a StoredRepo. Only the owner can update.
// Accepts { Readme: string } in the request body.
// -------------------------------------------------------------------------
const updateRepoReadme = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const { Readme } = req.body || {};

        if (typeof Readme !== 'string') {
            return res.status(400).json({ message: 'Readme must be a string' });
        }

        const repo = await StoredRepo.findOne({ _id: id, UserId: userId });
        if (!repo) {
            return res.status(404).json({ message: 'Repo not found' });
        }

        repo.Readme = Readme;
        repo.UpdatedAt = new Date();
        await repo.save();
        await createReadmeVersionSnapshot(repo, {
            source: 'manual-save'
        });

        res.status(200).json({ repo: repo.toObject() });
    } catch (error) {
        console.error('[updateRepoReadme] error:', error.message);
        res.status(500).json({ message: 'Server Error' });
    }
};

// -------------------------------------------------------------------------
// getRepoVersions
// GET /api/repos/:id/versions
// Returns saved README snapshots for a repo owned by the authenticated user.
// -------------------------------------------------------------------------
const getRepoVersions = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const repo = await StoredRepo.findOne({ _id: id, UserId: userId }).lean();
        if (!repo) {
            return res.status(404).json({ message: 'Repo not found' });
        }

        const versions = await ReadmeVersion.find({ StoredRepoId: id, UserId: userId })
            .sort({ VersionNumber: -1 })
            .lean();

        return res.status(200).json({
            versions: versions.map((version) => ({
                _id: version._id,
                versionNumber: version.VersionNumber,
                source: version.Source,
                sha: version.Sha || '',
                baseSha: version.BaseSha || '',
                branch: version.Branch || '',
                createdAt: version.CreatedAt,
                preview: String(version.Readme || '').slice(0, 220),
                metadata: version.Metadata || {},
            }))
        });
    } catch (error) {
        console.error('[getRepoVersions] error:', error.message);
        return res.status(500).json({ message: 'Server Error' });
    }
};

// -------------------------------------------------------------------------
// restoreRepoVersion
// POST /api/repos/:id/versions/:versionId/restore
// Restores a stored snapshot into the active README and records the restore.
// -------------------------------------------------------------------------
const restoreRepoVersion = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id, versionId } = req.params;

        const repo = await StoredRepo.findOne({ _id: id, UserId: userId });
        if (!repo) {
            return res.status(404).json({ message: 'Repo not found' });
        }

        const version = await ReadmeVersion.findOne({
            _id: versionId,
            StoredRepoId: id,
            UserId: userId
        });

        if (!version) {
            return res.status(404).json({ message: 'Version not found' });
        }

        repo.Readme = version.Readme;
        repo.UpdatedAt = new Date();
        repo.Metadata = {
            ...(repo.Metadata || {}),
            restoredFromVersionId: String(version._id),
            restoredFromVersionNumber: version.VersionNumber,
            restoredAt: new Date(),
        };
        await repo.save();

        await createReadmeVersionSnapshot(repo, {
            source: 'restore',
            metadata: {
                restoredFromVersionId: String(version._id),
                restoredFromVersionNumber: version.VersionNumber,
            }
        });

        return res.status(200).json({
            message: `Restored version v${version.VersionNumber}`,
            repo: repo.toObject()
        });
    } catch (error) {
        console.error('[restoreRepoVersion] error:', error.message);
        return res.status(500).json({ message: 'Server Error' });
    }
};

// -------------------------------------------------------------------------
// deleteRepo
// DELETE /api/repos/:id
// Deletes a StoredRepo by ID, only if it belongs to the authenticated user.
// -------------------------------------------------------------------------
const deleteRepo = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const repo = await StoredRepo.findOne({ _id: id, UserId: userId });
        if (!repo) {
            return res.status(404).json({ message: 'Repo not found' });
        }

        await StoredRepo.deleteOne({ _id: id });
        res.status(200).json({ message: 'Deleted' });
    } catch (error) {
        console.error('[deleteRepo] error:', error.message);
        res.status(500).json({ message: 'Server Error' });
    }
};

// -------------------------------------------------------------------------
// createReadmePullRequest
// POST /api/repos/:id/readme-pr
// Creates a branch, writes README.md at repo root, and opens a GitHub PR.
// -------------------------------------------------------------------------
const createReadmePullRequest = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const repo = await StoredRepo.findOne({ _id: id, UserId: userId });
        if (!repo) {
            return res.status(404).json({ message: 'Repo not found' });
        }

        const generatedReadme = typeof repo.Readme === 'string' ? repo.Readme.trim() : '';
        if (!generatedReadme) {
            return res.status(400).json({ message: 'Generate a README before creating a pull request' });
        }

        const oauthAccount = await OAuthAccount.findOne({
            UserId: userId,
            Provider: 'github'
        });

        if (!oauthAccount?.AccessToken) {
            return res.status(400).json({ message: 'Connect GitHub before creating a pull request' });
        }

        const scopes = Array.isArray(oauthAccount.Scopes) ? oauthAccount.Scopes : [];
        if (repo.IsPrivate && !scopes.includes('repo')) {
            return res.status(403).json({
                message: 'Private repo pull requests require GitHub repo scope. Reconnect GitHub with private repo access.'
            });
        }

        const owner = repo.Owner;
        const repoName = repo.Name;
        const defaultBranch = repo.DefaultBranch || 'main';
        const baseRef = await githubRequest({
            token: oauthAccount.AccessToken,
            path: `/repos/${owner}/${repoName}/git/ref/heads/${encodeURIComponent(defaultBranch)}`
        });

        const branchName = `readmemaybe/readme-${Date.now()}`;

        await githubRequest({
            token: oauthAccount.AccessToken,
            path: `/repos/${owner}/${repoName}/git/refs`,
            method: 'POST',
            body: {
                ref: `refs/heads/${branchName}`,
                sha: baseRef.object.sha
            }
        });

        let existingRootReadmeSha = '';
        try {
            const existingReadme = await githubRequest({
                token: oauthAccount.AccessToken,
                path: `/repos/${owner}/${repoName}/contents/README.md?ref=${encodeURIComponent(branchName)}`
            });
            existingRootReadmeSha = typeof existingReadme?.sha === 'string' ? existingReadme.sha : '';
        } catch (error) {
            if (!(error instanceof Error) || !error.message.startsWith('404 ')) {
                throw error;
            }
        }

        await githubRequest({
            token: oauthAccount.AccessToken,
            path: `/repos/${owner}/${repoName}/contents/README.md`,
            method: 'PUT',
            body: {
                message: 'docs: add generated README',
                content: Buffer.from(generatedReadme, 'utf8').toString('base64'),
                branch: branchName,
                ...(existingRootReadmeSha ? { sha: existingRootReadmeSha } : {})
            }
        });

        const pullRequest = await githubRequest({
            token: oauthAccount.AccessToken,
            path: `/repos/${owner}/${repoName}/pulls`,
            method: 'POST',
            body: {
                title: 'Add generated README',
                head: branchName,
                base: defaultBranch,
                body: [
                    'This pull request adds a `README.md` generated by ReadMeMaybe.',
                    '',
                    `Source repo: ${repo.FullName}`
                ].join('\n')
            }
        });

        repo.Metadata = {
            ...(repo.Metadata || {}),
            lastPullRequestUrl: pullRequest.html_url || '',
            lastPullRequestNumber: pullRequest.number || null,
            lastPullRequestBranch: branchName,
            lastPullRequestCreatedAt: new Date(),
            lastPullRequestState: pullRequest.state || 'open'
        };
        repo.UpdatedAt = new Date();
        await repo.save();

        return res.status(201).json({
            message: 'Pull request created successfully',
            prUrl: pullRequest.html_url,
            prNumber: pullRequest.number,
            branchName,
            repo: repo.toObject()
        });
    } catch (error) {
        console.error('[createReadmePullRequest] error:', error.message);
        return res.status(500).json({
            message: error.message || 'Failed to create pull request'
        });
    }
};

module.exports = {
    getUserRepos,
    deleteRepo,
    updateRepoReadme,
    createReadmePullRequest,
    getRepoVersions,
    restoreRepoVersion
};
