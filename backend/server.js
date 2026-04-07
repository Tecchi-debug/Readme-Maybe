const express = require('express'); 
const testRepoRoute = require('./routes/testRepoRoute');
const analyzeUrlRoute = require('./routes/gitRoutes');
const cors = require('cors');
const crypto = require('crypto');
const mongoose = require('mongoose');
const { loadSecrets, getSecretValue, getMongoUri, getAppPort, getSecretsDebugInfo } = require('./services/secretsManager');


const app = express();
const startedAt = new Date();
app.use(cors());
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


app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'Origin, X-Requested-With, Content-Type, Accept, Authorization'
    );
    res.setHeader(
        'Access-Control-Allow-Methods',
        'GET, POST, PATCH, DELETE, OPTIONS'
    );
    next();
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


/*app.post('/api/login', async (req, res, next) => {
    // incoming: login, password
    // outgoing: id, firstName, lastName, error

    var error = '';

    const { login, password } = req.body;

    const db = client.db('main');
    const results = await db.collection('Users').find({ Login: login, Password: password }).toArray();

    var id = -1;
    var fn = 'Empty';
    var ln = 'Too';

    if (results.length > 0) {
        id = results[0].UserID;
        fn = results[0].FirstName;
        ln = results[0].LastName;
    }

    var ret = { id: id, firstName: fn, lastName: ln, error: '' };
    res.status(200).json(ret);
});*/



app.post('/api/searchcards', async (req, res, next) => {
    // incoming: userId, search
    // outgoing: results[], error

    var error = '';

    const { userId, search } = req.body;

    var _search = search.trim();

    const db = client.db('main');
    const results = await db.collection('Cards').find({ "Card": { $regex: _search + '.*', $options: 'i' } }).toArray();

    var _ret = [];
    for (var i = 0; i < results.length; i++) {
        _ret.push(results[i].Card);
    }

    var ret = { results: _ret, error: error };
    res.status(200).json(ret);
});



app.use('/',analyzeUrlRoute);
app.use('/',testRepoRoute);

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

