const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

const lambdaClient = new LambdaClient({ region: 'us-east-2' });
const FUNCTION_NAME = 'test2';

function pickReadmeText(payloadBody) {
    if (!payloadBody) {
        return '';
    }

    if (typeof payloadBody === 'string') {
        return payloadBody.trim();
    }

    const candidates = [
        payloadBody.readme,
        payloadBody.Readme,
        payloadBody.generatedReadme,
        payloadBody.markdown,
        payloadBody.content,
    ];

    for (const value of candidates) {
        if (typeof value === 'string' && value.trim()) {
            return value;
        }
    }

    return '';
}

async function generateReadme(repoUrl, options = {}) {
    const trimmedUrl = String(repoUrl || '').trim();
    if (!trimmedUrl) {
        throw new Error('repoUrl is required');
    }

    const invokePayload = {
        actionGroup: 'Website',
        apiPath: '/readme/generate',
        httpMethod: 'POST',
        parameters: [],
        requestBody: {
            repoUrl: trimmedUrl,
            ...options,
        },
    };

    const command = new InvokeCommand({
        FunctionName: FUNCTION_NAME,
        InvocationType: 'RequestResponse',
        Payload: Buffer.from(JSON.stringify(invokePayload)),
    });

    const response = await lambdaClient.send(command);
    const payloadString = Buffer.from(response.Payload || []).toString('utf8');
    const payload = payloadString ? JSON.parse(payloadString) : {};

    if (response.FunctionError) {
        throw new Error('Lambda invocation failed');
    }

    let parsedBody = {};
    try {
        parsedBody = JSON.parse(payload.response.responseBody['application/json'].body);
    } catch (error) {
        parsedBody = payload;
    }

    const readmeText = pickReadmeText(parsedBody);
    return {
        readme: readmeText,
        raw: parsedBody,
    };
}

module.exports = {
    generateReadme,
};
