const analyzeUrl = require('../services/analyzerepo');
const StoredRepo = require('../models/StoredRepo');
const { getGithubToken } = require('../services/secretsManager');
const { generateReadme } = require('../services/readmeGenerator');

const saveRepo = require('../services/saveRepo');

async function getCompareSummary(owner, repoName, fromSha, toSha) {
    if (!fromSha || !toSha || fromSha === toSha) {
        return null;
    }

    const headers = {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
    };

    const githubToken = getGithubToken();
    if (githubToken) {
        headers.Authorization = `Bearer ${githubToken}`;
    }

    const compareUrl = `https://api.github.com/repos/${owner}/${repoName}/compare/${fromSha}...${toSha}`;
    const response = await fetch(compareUrl, { method: 'GET', headers });
    if (!response.ok) {
        return null;
    }
    
    const data = await response.json();
    return {
        status: data.status || '',
        aheadBy: data.ahead_by || 0,
        behindBy: data.behind_by || 0,
        totalCommits: data.total_commits || 0,
        changedFiles: Array.isArray(data.files) ? data.files.length : 0,
    };
}

const analyzeRepoController = async(req,res) => {
    try{
        const { repoUrl } = req.body;
        const { userId } = req.body;
        const requestedBaseSha = String(req.body?.baseSha || '').trim();
        const result = await analyzeUrl(repoUrl, userId);

        const existingRepo = await StoredRepo.findOne({
            UserId: result.UserId,
            FullName: result.FullName
        });

        const nextGenerationNumber = existingRepo
            ? (Number(existingRepo.GenerationNumber) || 0) + 1
            : 1;

        const baseSha = requestedBaseSha || existingRepo?.Sha || '';
        let regenerationMode = 'initial-generation';
        if (existingRepo) {
            regenerationMode = baseSha && baseSha !== result.Sha
                ? 'past-version-regeneration'
                : 'same-version-regeneration';
        }

        const compareSummary = await getCompareSummary(result.Owner, result.Name, baseSha, result.Sha);

        const generated = await generateReadme(repoUrl, {
            regenerationMode,
            baseSha,
            latestSha: result.Sha,
            compareSummary,
        });

        if (!generated.readme) {
            return res.status(502).json({
                error: 'README generation returned empty content',
                regenerationMode,
            });
        }

        result.Readme = generated.readme;
        result.GenerationNumber = nextGenerationNumber;
        result.Metadata = {
            ...(result.Metadata || {}),
            generation: {
                mode: regenerationMode,
                number: nextGenerationNumber,
                baseSha: baseSha || null,
                latestSha: result.Sha,
                compareSummary,
                generatedAt: new Date(),
            },
        };

        // Always stamp UpdatedAt so this repo sorts to the top of recent activity
        result.UpdatedAt = new Date();

        if (existingRepo && existingRepo.Sha === result.Sha) {
            console.log(`[analyze] No differences for ${result.FullName} (sha ${result.Sha})`);
            // Still bump UpdatedAt so the dashboard shows it as most recent
            const touched = await StoredRepo.findByIdAndUpdate(
                existingRepo._id,
                {
                    $set: {
                        Readme: result.Readme,
                        GenerationNumber: result.GenerationNumber,
                        Metadata: result.Metadata,
                        UpdatedAt: result.UpdatedAt,
                    },
                },
                { new: true }
            );
            touched.Metadata = {
                ...(touched.Metadata || {}),
                generation: {
                    ...(touched.Metadata?.generation || {}),
                    mode: regenerationMode,
                },
            };
            return res.status(200).json(touched);
        }

        let savedRepo;

        if (existingRepo) {
            result.CreatedAt = existingRepo.CreatedAt;
            savedRepo = await StoredRepo.findByIdAndUpdate(
                existingRepo._id,
                { $set: result },
                { new: true, runValidators: true }
            );
        } else {
            savedRepo = await StoredRepo.create(result);
        }

        return res.status(200).json({
            ...savedRepo.toObject(),
            regenerationMode,
        });
    } catch(error){
        res.status(500).json({
            error: error.message
        });
    }
};



module.exports = analyzeRepoController;
