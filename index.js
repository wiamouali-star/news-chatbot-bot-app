const restify = require('restify');

// 1. Créer le serveur
const server = restify.createServer();

// 2. Middleware pour parser le JSON
server.use(restify.plugins.bodyParser());

// 3. CORS basique
server.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

// 4. ENDPOINT PRINCIPAL - Version ultra simple
server.post('/api/messages', (req, res, next) => {
    console.log('=== MESSAGE RECU ===');
    console.log('Type:', req.body.type);
    console.log('Texte:', req.body.text);
    
    // Réponse fixe simple
    const response = {
        type: 'message',
        text: '🤖 Bonjour ! Je suis votre bot de test. Message reçu avec succès !'
    };
    
    console.log('=== REPONSE ENVOYEE ===');
    console.log(response);
    
    res.send(200, response);
    return next();
});

// 5. Health check
server.get('/api/health', (req, res, next) => {
    res.json({ status: 'OK', message: 'Bot en ligne' });
    return next();
});

// 6. Démarrer le serveur
const port = process.env.PORT || 3978;
server.listen(port, () => {
    console.log('=================================');
    console.log('🤖 BOT DE TEST DÉMARRÉ');
    console.log('📍 Port:', port);
    console.log('📍 Endpoint: POST /api/messages');
    console.log('=================================');
});
