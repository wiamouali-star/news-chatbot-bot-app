// CORRECTION COMPLÈTE du index.js
const restify = require('restify');

const server = restify.createServer();
server.use(restify.plugins.bodyParser());
server.use(restify.plugins.queryParser());

// CORS pour Azure Bot Service
server.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return next();
});

server.opts('/api/messages', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.send(200);
    return next();
});

// FORMAT DE RÉPONSE CORRIGÉ pour Azure Bot Service
server.post('/api/messages', (req, res, next) => {
    console.log('📨 Message reçu:', req.body.type);
    
    try {
        const activity = req.body;
        let responseText = '';
        
        // Gestion des différents types de messages
        if (activity.type === 'conversationUpdate') {
            // Message de bienvenue quand la conversation commence
            if (activity.membersAdded && activity.membersAdded.some(m => m.id.includes('user'))) {
                responseText = '👋 Bonjour ! Je suis votre assistant actualités. Sélectionnez un article pour discuter.';
            }
        } 
        else if (activity.type === 'event' && activity.name === 'newsSelected') {
            console.log('🎯 Article sélectionné:', activity.value.title);
            responseText = `📰 Merci d'avoir sélectionné : "${activity.value.title}"\n\nQue souhaitez-vous savoir sur cet article ?`;
        } 
        else if (activity.type === 'message') {
            console.log('💬 Message texte:', activity.text);
            responseText = `🤖 J'ai reçu votre message : "${activity.text}"\n\nJe suis un bot simple qui fonctionne ! 🎉`;
        }
        
        // CONSTRUIRE LA RÉPONSE AU FORMAT AZURE BOT SERVICE
        const responseActivity = {
            type: 'message',
            timestamp: new Date().toISOString(),
            from: {
                id: 'bot',
                name: 'News Bot',
                role: 'bot'
            },
            conversation: activity.conversation,
            recipient: activity.from || { id: 'user' },
            text: responseText || 'Je suis votre assistant actualités. Comment puis-je vous aider ?',
            replyToId: activity.id
        };
        
        console.log('📤 Envoi réponse:', responseActivity.text);
        res.json(responseActivity);
        
    } catch (error) {
        console.error('❌ Erreur:', error);
        res.json({
            type: 'message',
            text: '❌ Désolé, une erreur est survenue. Veuillez réessayer.'
        });
    }
    
    return next();
});

// Route santé
server.get('/', (req, res, next) => {
    res.json({
        status: 'OK',
        message: '🤖 Bot Azure - EN FONCTIONNEMENT !',
        timestamp: new Date().toISOString(),
        version: '2.0-azure-fix'
    });
    return next();
});

// Route pour les tests de santé Azure
server.get('/api/health', (req, res, next) => {
    res.json({
        status: 'healthy',
        service: 'Azure Bot Service Endpoint',
        timestamp: new Date().toISOString()
    });
});

const port = process.env.PORT || 3978;
server.listen(port, () => {
    console.log(`🎉 BOT AZURE DÉMARRÉ sur le port ${port}`);
    console.log('📍 Endpoint: /api/messages');
    console.log('✅ Prêt pour Azure Bot Service');
});
