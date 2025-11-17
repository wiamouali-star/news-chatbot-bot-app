const restify = require('restify');
const jwt = require('jsonwebtoken'); // npm install jsonwebtoken

const server = restify.createServer();
server.use(restify.plugins.bodyParser());
server.use(restify.plugins.queryParser());

// Middleware d'authentification pour Azure Bot Service
function authenticateBot(req, res, next) {
    // En développement, vous pouvez désactiver temporairement l'auth
    if (process.env.NODE_ENV === 'development') {
        return next();
    }

    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.error('❌ Token manquant');
        res.send(401, 'Unauthorized: Token manquant');
        return next(false);
    }

    const token = authHeader.substring(7);
    
    try {
        // Validation basique du token
        // En production, utilisez la validation complète Azure AD
        const decoded = jwt.decode(token);
        console.log('✅ Token décodé:', decoded?.appId ? 'Valide' : 'Invalide');
        return next();
    } catch (error) {
        console.error('❌ Token invalide:', error.message);
        res.send(401, 'Unauthorized: Token invalide');
        return next(false);
    }
}

// Appliquer l'authentification uniquement sur /api/messages
server.post('/api/messages', authenticateBot, (req, res, next) => {
    console.log('📨 Message authentifié reçu:', req.body.type);
    
    try {
        const activity = req.body;
        
        // VALIDATION DE L'ACTIVITÉ
        if (!activity || !activity.type) {
            console.error('❌ Activité invalide');
            res.send(400, { error: 'Activité invalide' });
            return next();
        }

        let responseText = '';
        
        if (activity.type === 'conversationUpdate') {
            if (activity.membersAdded && activity.membersAdded.some(m => m.id.includes('user'))) {
                responseText = '👋 Bonjour ! Je suis votre assistant actualités.';
            }
        } 
        else if (activity.type === 'event' && activity.name === 'newsSelected') {
            responseText = `📰 Article sélectionné: "${activity.value.title}"\n\nQue souhaitez-vous savoir ?`;
        } 
        else if (activity.type === 'message' && activity.text) {
            responseText = `🤖 Message reçu: "${activity.text}"\n\nJe fonctionne ! 🎉`;
        } else {
            responseText = '👋 Bonjour ! Comment puis-je vous aider ?';
        }

        // RÉPONSE SIMPLIFIÉE MAIS VALIDE
        const responseActivity = {
            type: 'message',
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            serviceUrl: activity.serviceUrl,
            channelId: activity.channelId,
            from: { id: 'bot', name: 'News Bot' },
            conversation: activity.conversation,
            recipient: activity.from || { id: 'user' },
            text: responseText
        };

        console.log('📤 Envoi réponse réussie');
        res.send(200, responseActivity);
        
    } catch (error) {
        console.error('❌ Erreur interne:', error);
        res.send(500, { 
            error: 'Internal Server Error',
            message: error.message 
        });
    }
    
    return next();
});

// Route santé publique (sans auth)
server.get('/api/health', (req, res, next) => {
    res.json({
        status: 'healthy',
        service: 'Bot Endpoint',
        timestamp: new Date().toISOString(),
        auth: 'required for /api/messages'
    });
    return next();
});

server.get('/', (req, res, next) => {
    res.json({
        message: '🤖 Bot Service Running',
        endpoint: '/api/messages',
        status: 'active'
    });
    return next();
});

const port = process.env.PORT || 3978;
server.listen(port, () => {
    console.log(`🎉 Bot Azure Direct Line sur port ${port}`);
    console.log('🔐 Authentification: ' + (process.env.NODE_ENV === 'development' ? 'DÉSACTIVÉE' : 'ACTIVE'));
});
