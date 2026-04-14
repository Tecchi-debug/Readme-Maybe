const express = require('express'); 
const analyzeUrlRoute = require('./routes/gitRoutes');
const readmeRoutes = require('./routes/readmeRoutes');
const cors = require('cors');
const crypto = require('crypto');
const mongoose = require('mongoose');
const { loadSecrets, getSecretValue, getMongoUri, getAppPort, getSecretsDebugInfo } = require('./services/secretsManager');


const app = express();
const startedAt = new Date();

// CORS configuration - must be applied BEFORE routes
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
    credentials: false
}));

app.use(express.json());
app.set('trust proxy', 1);

app.use((req, res, next) => {
    const requestId = req.headers['x-request-id'] || crypto.randomUUID();
    req.requestId = requestId;
    res.setHeader('X-Request-Id', requestId);
    next();
});

app.use((req, res, next) => {
    const started = Date.now();

    res.on('finish', () => {
        const durationMs = Date.now() - started;
        const logEvent = {
            level: 'info',
            event: 'http_request',
            requestId: req.requestId,
            method: req.method,
            path: req.originalUrl,
            statusCode: res.statusCode,
            durationMs,
            ip: req.ip,
            userAgent: req.get('user-agent') || '',
        };

        console.log(JSON.stringify(logEvent));
    });

    next();
});

const MongoClient = require('mongodb').MongoClient;
let client;

const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);
app.use('/readme', readmeRoutes);

async function initDatabase() {
    const mongoUri = await getMongoUri();
    mongoose.connect(mongoUri)
    .then(() => console.log('MongoDB connected (Mongoose)'))
    .catch(err => console.error(err));
}

mongoose.connection.on('connected', () => {
    console.log(JSON.stringify({ level: 'info', event: 'mongo_connected' }));
});

mongoose.connection.on('disconnected', () => {
    console.warn(JSON.stringify({ level: 'warn', event: 'mongo_disconnected' }));
});

mongoose.connection.on('error', (error) => {
    console.error(JSON.stringify({ level: 'error', event: 'mongo_error', message: error.message }));
});

app.get('/healthz', (req, res) => {
    res.status(200).json({
        status: 'ok',
        uptimeSec: Math.floor(process.uptime()),
        startedAt,
        now: new Date(),
    });
});

app.get('/readyz', (req, res) => {
    const mongoReady = mongoose.connection.readyState === 1;
    const secretsInfo = getSecretsDebugInfo();
    const ready = mongoReady && secretsInfo.loaded;

    res.status(ready ? 200 : 503).json({
        ready,
        mongoReady,
        secretsLoaded: secretsInfo.loaded,
    });
});


app.use('/',analyzeUrlRoute);


async function startServer() {
    try {
        await loadSecrets();
        getSecretValue('MONGODB_URI');
        getSecretValue('JWT_SECRET');
        getSecretValue('EMAIL_HOST');
        getSecretValue('EMAIL_USER');
        getSecretValue('EMAIL_PASS');
        getSecretValue('EMAIL_FROM');

        await initDatabase();

        const secretsInfo = getSecretsDebugInfo();
        console.log(JSON.stringify({
            level: 'info',
            event: 'secrets_loaded',
            secretId: secretsInfo.secretId,
            region: secretsInfo.region,
            loaded: secretsInfo.loaded,
            keyCount: secretsInfo.keys.length,
        }));

        const port = getAppPort();
        app.listen(port, '127.0.0.1', () => {
            console.log(JSON.stringify({ level: 'info', event: 'server_started', host: '127.0.0.1', port }));
        });
    } catch (err) {
        console.error(JSON.stringify({ level: 'error', event: 'startup_failed', message: err.message }));
        process.exit(1);
    }
}

process.on('unhandledRejection', (reason) => {
    const message = reason instanceof Error ? reason.message : String(reason);
    console.error(JSON.stringify({ level: 'error', event: 'unhandled_rejection', message }));
});

process.on('uncaughtException', (error) => {
    console.error(JSON.stringify({ level: 'error', event: 'uncaught_exception', message: error.message }));
    process.exit(1);
});

startServer();
