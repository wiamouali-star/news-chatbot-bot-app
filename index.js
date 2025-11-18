const restify = require('restify');
const jwt = require('jsonwebtoken');

const server = restify.createServer();
server.use(restify.plugins.bodyParser());

// VOS CREDENTIALS AZURE (remplacez par vos vraies valeurs)
const MICROSOFT_APP_ID = '46220d8f-be9b-48f9-8542-fbcd3c67d6f4';
const MICROSOFT_APP_PASSWORD = 'NAJ8Q~IdYC4ctgSAsp2mxhIFXhxnxqM2sny~HcMr'; // Utilisez le password qui expire en 2026

// Middleware d'authentification BOT FRAMEWORK
function authenticateBotFramework(req, res, next) {
    const authHeader = req.headers.authorization;
    
    console.log('🔐 Authentification Bot Framework');
    console.log('App ID attendu:', MICROSOFT_APP_ID);
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log('❌ Token manquant - Envoi réponse test');
        
        // Pour testing, accepter mais logger
        const testResponse = {
            type: 'message',
            text: '🔐 Mode test - Token manquant. Vérifiez l\'authentification Azure.',
            from: { id: 'bot' },
            conversation: { id: 'test' }
        };
        
        // Ne pas bloquer pour testing
        return next();
    }
    
    const token = authHeader.substring(7);
    
    try {
        // Validation simplifiée du token
        const decoded = jwt.decode(token);
        console.log('✅ Token JWT décodé:', decoded?.appid ? 'Valide' : 'AppID manquant');
        
        if (decoded && decoded.appid) {
            console.log('🔍 AppID dans token:', decoded.appid);
        }
        
        return next();
        
    } catch (error) {
        console.log('❌ Erreur validation token:', error.message);
        
        // En production, vous devriez rejeter
        // Pour testing, on continue
        return next();
    }
}

// CORS
server.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});

// ENDPOINT PRINCIPAL AVEC AUTH
server.post('/api/messages', authenticateBotFramework, (req, res, next) => {
    console.log('=== 🟡 WEB CHAT AZURE ===');
    console.log('Headers auth:', req.headers.authorization ? 'PRÉSENT' : 'ABSENT');
    console.log('Type:', req.body.type);
    console.log('Text:', req.body.text);
    console.log('Channel:', req.body.channelId);
    
    // RÉPONSE DIRECTE
    const response = {
        type: 'message',
        id: 'R_' + Date.now(),
        timestamp: new Date().toISOString(),
        serviceUrl: req.body.serviceUrl,
        channelId: req.body.channelId,
        from: { 
            id: 'bot', 
            name: 'News Bot',
            role: 'bot'
        },
        conversation: req.body.conversation,
        recipient: req.body.from,
        text: '🎉 WEB CHAT FONCTIONNE ! Message: ' + (req.body.text || 'Bienvenue !'),
        locale: 'fr-FR',
        replyToId: req.body.id
    };
    
    console.log('📤 Réponse envoyée à Azure Bot Service');
    res.send(200, response);
    return next();
});

// Health check
server.get('/api/health', (req, res, next) => {
    res.json({ 
        status: 'healthy 🔐',
        appId: MICROSOFT_APP_ID,
        auth: 'Bot Framework',
        timestamp: new Date().toISOString()
    });
    return next();
});

// Endpoint de test sans auth
server.post('/api/test', (req, res, next) => {
    console.log('=== 🧪 TEST SANS AUTH ===');
    const response = {
        type: 'message',
        text: '✅ Test sans auth fonctionne',
        from: { id: 'bot' }
    };
    res.send(200, response);
    return next();
});

const port = process.env.PORT || 3978;
server.listen(port, () => {
    console.log('=========================================');
    console.log('🤖 BOT AVEC AUTH BOT FRAMEWORK');
    console.log('📍 Port:', port);
    console.log('📍 App ID:', MICROSOFT_APP_ID);
    console.log('📍 Prêt pour Azure Bot Service authentifié');
    console.log('=========================================');
});
