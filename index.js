const restify = require('restify');

const server = restify.createServer();
server.use(restify.plugins.bodyParser());

server.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});

// STOCKAGE GLOBAL pour voir TOUS les appels
const allRequests = [];

server.post('/api/messages', (req, res, next) => {
    const requestLog = {
        timestamp: new Date().toISOString(),
        method: 'POST',
        url: '/api/messages',
        headers: req.headers,
        body: req.body,
        source: req.headers['user-agent'] || 'Unknown'
    };
    
    allRequests.push(requestLog);
    
    console.log('=== 🔥 NOUVEL APPEL AZURE ? ===');
    console.log('User-Agent:', req.headers['user-agent']);
    console.log('Body:', JSON.stringify(req.body, null, 2));
    
    // Réponse immédiate
    const resourceResponse = { id: 'R_' + Date.now() };
    res.send(200, resourceResponse);
    return next();
});

// ENDPOINT pour voir tous les appels
server.get('/api/debug', (req, res, next) => {
    res.json({
        totalRequests: allRequests.length,
        requests: allRequests,
        timestamp: new Date().toISOString()
    });
    return next();
});

server.get('/api/health', (req, res, next) => {
    res.json({ 
        status: 'healthy', 
        totalRequests: allRequests.length,
        timestamp: new Date().toISOString()
    });
    return next();
});

const port = process.env.PORT || 3978;
server.listen(port, () => {
    console.log('=========================================');
    console.log('🤖 BOT DEBUG - EN ATTENTE D\'APPELS AZURE');
    console.log('📍 Port:', port);
    console.log('📍 Debug URL: /api/debug');
    console.log('=========================================');
});
