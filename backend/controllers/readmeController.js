const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

const lambdaClient = new LambdaClient({ region: 'us-east-2' });
const FUNCTION_NAME = 'test2';

const readmeController = async (req, res) => {
    try {
        const { repoUrl = '' } = req.body;

        if (!repoUrl.trim()) {
            return res.status(400).json({ message: 'repoUrl is required' });
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

        return res.status(200).json(parsedBody);
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: error.message || 'Failed to generate README'
        });
    }
};

module.exports = readmeController;
