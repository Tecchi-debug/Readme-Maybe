const { generateReadme } = require('../services/readmeGenerator');

const readmeController = async (req, res) => {
    try {
        const { repoUrl = '' } = req.body;

        if (!repoUrl.trim()) {
            return res.status(400).json({ message: 'repoUrl is required' });
        }

        const generated = await generateReadme(repoUrl.trim());
        if (!generated.readme) {
            return res.status(502).json({ message: 'README generation returned empty content' });
        }

        return res.status(200).json({
            Readme: generated.readme,
            source: 'lambda',
            details: generated.raw,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: error.message || 'Failed to generate README'
        });
    }
};

module.exports = readmeController;
