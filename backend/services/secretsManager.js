const path = require('path');
const dotenv = require('dotenv');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

let cachedSecrets = null;
let loadedAt = null;
let loadedSource = null;

const SECRET_REGION = process.env.AWS_REGION || 'us-east-2';
const SECRET_ID = process.env.AWS_SECRET_ID || 'prod/readmemaybe/app';
const LOCAL_ENV_PATH = path.join(__dirname, '..', '.env');
const LOCAL_SECRET_KEYS = [
    'MONGODB_URI',
    'JWT_SECRET',
    'EMAIL_HOST',
    'EMAIL_PORT',
    'EMAIL_USER',
    'EMAIL_PASS',
    'EMAIL_FROM',
    'GITHUB_TOKEN',
    'PORT',
];

function shouldLoadLocalSecrets() {
    if (process.env.USE_LOCAL_SECRETS === 'true') {
        return true;
    }

    if (process.env.USE_AWS_SECRETS === 'true') {
        return false;
    }

    return process.env.NODE_ENV !== 'production';
}

function loadSecretsFromDotEnv() {
    dotenv.config({ path: LOCAL_ENV_PATH });

    cachedSecrets = LOCAL_SECRET_KEYS.reduce((secrets, key) => {
        if (process.env[key] !== undefined) {
            secrets[key] = process.env[key];
        }

        return secrets;
    }, {});

    loadedAt = new Date();
    loadedSource = 'local';
    return cachedSecrets;
}

async function loadSecrets() {
    if (cachedSecrets) {
        return cachedSecrets;
    }

    if (shouldLoadLocalSecrets()) {
        return loadSecretsFromDotEnv();
    }

    const client = new SecretsManagerClient({ region: SECRET_REGION });
    const response = await client.send(new GetSecretValueCommand({ SecretId: SECRET_ID }));
    cachedSecrets = JSON.parse(response.SecretString || '{}');
    loadedAt = new Date();
    loadedSource = 'aws';
    return cachedSecrets;
}

function ensureSecretsLoaded() {
    if (cachedSecrets) {
        return cachedSecrets;
    }

    if (shouldLoadLocalSecrets()) {
        return loadSecretsFromDotEnv();
    }

    throw new Error('AWS secrets not loaded. Call loadSecrets() at startup.');
}

function getSecretValue(secretKey) {
    ensureSecretsLoaded();

    const secretValue = cachedSecrets[secretKey];
    if (secretValue === undefined || secretValue === null || secretValue === '') {
        const sourceLabel = loadedSource === 'local' ? '.env' : 'secret payload';
        throw new Error(`${secretKey} missing in ${sourceLabel}`);
    }

    return secretValue;
}

function getOptionalSecretValue(secretKey, defaultValue = '') {
    ensureSecretsLoaded();

    const secretValue = cachedSecrets[secretKey];
    if (secretValue === undefined || secretValue === null || secretValue === '') {
        return defaultValue;
    }

    return secretValue;
}

async function getMongoUri() {
    const secrets = await loadSecrets();
    if (!secrets.MONGODB_URI) {
        throw new Error('MONGODB_URI missing in Secrets');
    }
    return secrets.MONGODB_URI;
}

async function loadAwsSecrets() {
    return loadSecrets();
}

function getJwtSecret() {
    return getSecretValue('JWT_SECRET');
}

function getEmailConfig() {
    const host = getSecretValue('EMAIL_HOST');
    const port = Number(getOptionalSecretValue('EMAIL_PORT', 587));
    const user = getSecretValue('EMAIL_USER');
    const pass = getSecretValue('EMAIL_PASS');
    const from = getSecretValue('EMAIL_FROM');

    return {
        host,
        port: Number.isNaN(port) ? 587 : port,
        user,
        pass,
        from,
    };
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
        source: loadedSource,
        secretId: SECRET_ID,
        region: SECRET_REGION,
        keys: cachedSecrets ? Object.keys(cachedSecrets) : [],
    };
}

module.exports = {
    loadSecrets,
    loadAwsSecrets,
    getSecretValue,
    getMongoUri,
    getJwtSecret,
    getEmailConfig,
    getGithubToken,
    getAppPort,
    getSecretsDebugInfo,
};