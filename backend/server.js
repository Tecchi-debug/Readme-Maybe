require('dotenv').config();
const express = require('express'); 
const testRepoRoute = require('./routes/testRepoRoute');
const analyzeUrlRoute = require('./routes/gitRoutes');
const readmeRoutes = require('./routes/readmeRoutes');
const cors = require('cors');
const mongoose = require('mongoose');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const PORT = process.env.PORT || 5000;


const app = express();
app.use(cors());
app.use(express.json());
app.set('trust proxy', 1);

const MongoClient = require('mongodb').MongoClient;
let client;

const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

const hardcodedMongoUri = process.env.MONGODB_URI;

async function getMongoUri() {
    try{
        const client = new SecretsManagerClient({ region: "us-east-2" });
        const response = await client.send(new GetSecretValueCommand({ SecretId: "prod/readmemaybe/database" }));
        const secrets = JSON.parse(response.SecretString);
        if (!secrets.MONGODB_URI) throw new Error('MONGODB_URI missing in Secrets');
        return secrets.MONGODB_URI; 
    }catch(err){
        console.warn('Could not get AWS secret. Using hard coded MONGODB_URI');
        return hardcodedMongoUri;
    }
}

async function initDatabase() {
    const mongoUri = await getMongoUri();
    mongoose.connect(mongoUri)
    .then(() => console.log('MongoDB connected (Mongoose)'))
    .catch(err => console.error(err));
}

initDatabase()
    .then(() => {
        app.listen(PORT, '127.0.0.1', () => {
            console.log(`API listening on 127.0.0.1:${PORT}`);
        });
    })
    .catch(err =>{
        console.error('Failed to connect to MongoDB:', err);
        process.exit(1);
    })



/*mongoose.connect(hardcodedMongoUri)
  .then(() => console.log('MongoDB connected (Mongoose)'))
  .catch(err => console.error(err));
*/

/*async function initializeDatabase() {
    let url = '';

    try {
        url = await getMongoUri();
    }
    catch (error) {
        if (error && error.name === 'CredentialsProviderError') {
            console.warn('AWS credentials not found, using hardcoded Mongo URI for local run.');
            url = hardcodedMongoUri;
        }
        else {
            throw error;
        }
    }

    if (!url) {
        throw new Error('Secret must contain MONGODB_URI');
    }

    const clientOptions = {
        tls: true,
        tlsAllowInvalidCertificates: false,
        serverSelectionTimeoutMS: 5000,
    };

    client = new MongoClient(url, clientOptions);
    await client.connect();
    console.log('Successfully connected to MongoDB!');
}
*/
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
app.use('/readme', readmeRoutes);
