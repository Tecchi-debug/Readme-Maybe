const StoredRepo = require('../models/StoredRepo');

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

        res.status(200).json({ repo: repo.toObject() });
    } catch (error) {
        console.error('[updateRepoReadme] error:', error.message);
        res.status(500).json({ message: 'Server Error' });
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

module.exports = { getUserRepos, deleteRepo, updateRepoReadme };
