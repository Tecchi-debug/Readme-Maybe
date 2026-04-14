const ReadmeVersion = require('../models/ReadmeVersion');

function buildVersionMetadata(repo, extraMetadata = {}) {
    return {
        generation: repo?.Metadata?.generation || null,
        generatedBy: repo?.Metadata?.generatedBy || '',
        generatedAt: repo?.Metadata?.generatedAt || null,
        selectedFiles: Array.isArray(repo?.Metadata?.selectedFiles) ? repo.Metadata.selectedFiles : [],
        readmePath: repo?.ReadmePath || '',
        ...extraMetadata,
    };
}

async function createReadmeVersionSnapshot(repo, options = {}) {
    const readme = typeof repo?.Readme === 'string' ? repo.Readme.trim() : '';
    if (!repo?._id || !repo?.UserId || !readme) {
        return null;
    }

    const latestVersion = await ReadmeVersion.findOne({ StoredRepoId: repo._id })
        .sort({ VersionNumber: -1 })
        .lean();

    const nextVersionNumber = latestVersion ? latestVersion.VersionNumber + 1 : 1;
    const sha = options.sha ?? repo.Sha ?? '';
    const source = options.source || 'unknown';
    const metadata = buildVersionMetadata(repo, options.metadata || {});

    if (
        latestVersion &&
        latestVersion.Readme === readme &&
        String(latestVersion.Sha || '') === String(sha || '') &&
        String(latestVersion.Source || '') === String(source || '')
    ) {
        return null;
    }

    return ReadmeVersion.create({
        UserId: repo.UserId,
        StoredRepoId: repo._id,
        RepoName: repo.Name,
        RepoFullName: repo.FullName,
        VersionNumber: nextVersionNumber,
        Source: source,
        Readme: readme,
        Sha: sha,
        BaseSha: options.baseSha ?? repo?.Metadata?.generation?.baseSha ?? '',
        Branch: options.branch ?? repo.DefaultBranch ?? '',
        Metadata: metadata,
        CreatedAt: new Date(),
    });
}

module.exports = { createReadmeVersionSnapshot };
