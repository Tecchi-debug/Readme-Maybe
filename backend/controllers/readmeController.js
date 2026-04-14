const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
const StoredRepo = require('../models/StoredRepo');
const analyzeRepo = require('../services/analyzerepo');
const { createReadmeVersionSnapshot } = require('../services/readmeVersioning');

const lambdaClient = new LambdaClient({ region: 'us-east-2' });
const FUNCTION_NAME = 'test2';

async function persistGeneratedReadme({ repoUrl, userId, generatedReadme, lambdaPayload }) {
    const analyzedRepo = await analyzeRepo(repoUrl, userId);
    const now = new Date();

    analyzedRepo.Readme = generatedReadme;
    analyzedRepo.ReadmePath = analyzedRepo.ReadmePath || 'AI_GENERATED';
    analyzedRepo.UpdatedAt = now;
    analyzedRepo.LastIndexedAt = now;
    analyzedRepo.Metadata = {
        ...(analyzedRepo.Metadata || {}),
        generatedBy: 'lambda',
        generatedAt: now,
        generationMessage: lambdaPayload?.message || '',
        selectedFiles: Array.isArray(lambdaPayload?.selected_files) ? lambdaPayload.selected_files : []
    };

    const existingRepo = await StoredRepo.findOne({
        UserId: analyzedRepo.UserId,
        FullName: analyzedRepo.FullName
    });

    let savedRepo;
    if (existingRepo) {
        analyzedRepo.CreatedAt = existingRepo.CreatedAt;
        analyzedRepo.GenerationNumber = (Number(existingRepo.GenerationNumber) || 0) + 1;
        savedRepo = await StoredRepo.findByIdAndUpdate(
            existingRepo._id,
            { $set: analyzedRepo },
            { new: true, runValidators: true }
        );
    } else {
        analyzedRepo.GenerationNumber = 1;
        savedRepo = await StoredRepo.create(analyzedRepo);
    }

    await createReadmeVersionSnapshot(savedRepo, {
        source: 'lambda-generation',
        metadata: {
            message: lambdaPayload?.message || '',
        }
    });

    return savedRepo;
}

const readmeController = async (req, res) => {
    try {
        const { repoUrl = '' } = req.body;
        const userId = req.user?.id;

        if (!repoUrl.trim()) {
            return res.status(400).json({ message: 'repoUrl is required' });
        }

        if (!userId) {
            return res.status(401).json({ message: 'User authentication is required' });
        }

        const invokePayload = {
            actionGroup: 'Website',
            apiPath: '/readme/generate',
            httpMethod: 'POST',
            parameters: [],
            requestBody: { repoUrl: repoUrl.trim() }
        };

        const command = new InvokeCommand({
            FunctionName: FUNCTION_NAME,
            InvocationType: 'RequestResponse',
            Payload: Buffer.from(JSON.stringify(invokePayload))
        });

        const response = await lambdaClient.send(command);
        const payloadString = Buffer.from(response.Payload || []).toString('utf8');
        const payload = payloadString ? JSON.parse(payloadString) : {};

        if (response.FunctionError) {
            return res.status(502).json({
                message: 'Lambda invocation failed',
                details: payload
            });
        }

        const parsedBody = JSON.parse(
            payload.response.responseBody['application/json'].body
        );

        const generatedReadme = typeof parsedBody?.readme === 'string' ? parsedBody.readme.trim() : '';
        if (!generatedReadme) {
            return res.status(200).json(parsedBody);
        }

        const savedRepo = await persistGeneratedReadme({
            repoUrl: repoUrl.trim(),
            userId,
            generatedReadme,
            lambdaPayload: parsedBody
        });

        return res.status(200).json({
            ...savedRepo.toObject(),
            message: parsedBody.message || 'README generated successfully',
            selected_files: parsedBody.selected_files || [],
            repo: parsedBody.repo || savedRepo.FullName,
            readme: generatedReadme
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: error.message || 'Failed to generate README'
        });
    }
};

module.exports = readmeController;
