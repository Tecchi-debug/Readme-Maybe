const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

let cachedSecrets = null;
let loadedAt = null;

const SECRET_REGION = 'us-east-2';
const SECRET_ID = 'prod/readmemaybe/database';

async function loadAwsSecrets() {
    if (cachedSecrets) {
        return cachedSecrets;
    }

    const client = new SecretsManagerClient({ region: SECRET_REGION });
    const response = await client.send(new GetSecretValueCommand({ SecretId: SECRET_ID }));
    cachedSecrets = JSON.parse(response.SecretString || '{}');
    loadedAt = new Date();
    return cachedSecrets;
}

function getSecretValue(secretKey) {
    if (!cachedSecrets) {
        throw new Error('AWS secrets not loaded. Call loadAwsSecrets() at startup.');
    }

    const secretValue = cachedSecrets[secretKey];
    if (!secretValue) {
        throw new Error(`${secretKey} missing in AWS Secrets Manager payload`);
    }

    return secretValue;
}

function getOptionalSecretValue(secretKey, defaultValue = '') {
    if (!cachedSecrets) {
        throw new Error('AWS secrets not loaded. Call loadAwsSecrets() at startup.');
    }

    const secretValue = cachedSecrets[secretKey];
    if (secretValue === undefined || secretValue === null || secretValue === '') {
        return defaultValue;
    }

    return secretValue;
}

async function getMongoUri() {
    const secrets = await loadAwsSecrets();
    if (!secrets.MONGODB_URI) {
        throw new Error('MONGODB_URI missing in Secrets');
    }
    return secrets.MONGODB_URI;
}

function getJwtSecret() {
    return getSecretValue('JWT_SECRET');
}

function getGithubToken() {
    try {
        return getSecretValue('GITHUB_TOKEN');
    } catch (error) {
        return '';
    }
}

function getAppPort() {
    const rawPort = getOptionalSecretValue('PORT', 5000);
    const parsedPort = Number(rawPort);
    return Number.isNaN(parsedPort) ? 5000 : parsedPort;
}

function getSecretsDebugInfo() {
    return {
        loaded: Boolean(cachedSecrets),
        loadedAt,
        secretId: SECRET_ID,
        region: SECRET_REGION,
        keys: cachedSecrets ? Object.keys(cachedSecrets) : [],
    };
}

module.exports = {
    loadAwsSecrets,
    getMongoUri,
    getJwtSecret,
    getGithubToken,
    getAppPort,
    getSecretsDebugInfo,
};