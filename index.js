const restify = require('restify');

const server = restify.createServer();
server.use(restify.plugins.bodyParser());
server.use(restify.plugins.queryParser());

// Middleware CORS
server.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return next();
});

// Route OPTIONS pour CORS
server.opts('/api/messages', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.send(200);
    return next();
});

// Stockage simple en mémoire
const conversations = new Map();

// Route principale - BOT SANS FRAMEWORK (CORRIGÉE)
server.post('/api/messages', (req, res, next) => {  // ← AJOUT DU "next"
    console.log('📨 Message reçu sur /api/messages');
    console.log('📦 Body:', JSON.stringify(req.body, null, 2));
    
    try {
        const activity = req.body;
        
        // Gérer les différents types d'activités
        if (activity.type === 'event' && activity.name === 'newsSelected') {
            console.log('🎯 Événement newsSelected:', activity.value);
            
            const response = [{
                type: 'message',
                text: `📰 Merci d'avoir sélectionné : "${activity.value.title}"\n\nQue souhaitez-vous savoir sur cet article ?`,
                from: { id: 'bot', name: 'News Bot' },
                recipient: activity.from
            }];
            
            console.log('📤 Réponse événement:', response);
            res.json(response);
            
        } else if (activity.type === 'message') {
            console.log('💬 Message texte:', activity.text);
            
            const response = [{
                type: 'message',
                text: `🤖 J'ai reçu votre message : "${activity.text}"\n\nJe suis un bot simple qui fonctionne ! 🎉`,
                from: { id: 'bot', name: 'News Bot' },
                recipient: activity.from
            }];
            
            console.log('📤 Réponse message:', response);
            res.json(response);
            
        } else {
            // Réponse par défaut
            const response = [{
                type: 'message',
                text: '👋 Bonjour ! Je suis votre assistant actualités. Sélectionnez un article pour discuter.',
                from: { id: 'bot', name: 'News Bot' },
                recipient: activity.from || { id: 'user' }
            }];
            
            res.json(response);
        }
        
    } catch (error) {
        console.error('❌ Erreur:', error);
        res.json([{
            type: 'message',
            text: '❌ Désolé, une erreur est survenue.'
        }]);
    }
    
    return next();  // ← IMPORTANT : Appeler next()
});

// Route santé
server.get('/', (req, res, next) => {
    res.json({
        status: 'OK',
        message: '🤖 Bot simple sans Bot Framework - EN FONCTIONNEMENT !',
        timestamp: new Date().toISOString()
    });
    return next();
});

const port = process.env.PORT || 3978;
server.listen(port, () => {
    console.log(`🎉 BOT SIMPLE DÉMARRÉ sur le port ${port}`);
    console.log('✅ SANS Bot Framework - SANS authentification');
    console.log('📍 Test: http://localhost:' + port + '/');
});
