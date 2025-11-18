const restify = require('restify');

const server = restify.createServer();
server.use(restify.plugins.bodyParser());

server.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});

// Stockage pour les activités de réponse
const conversationActivities = new Map();

server.post('/api/messages', (req, res, next) => {
    console.log('=== 📨 MESSAGE REÇU ===');
    console.log('Type:', req.body.type);
    console.log('Text:', req.body.text);
    console.log('Channel:', req.body.channelId);
    
    const incomingActivity = req.body;
    const conversationId = incomingActivity.conversation?.id;
    
    if (conversationId) {
        // Initialiser le stockage
        if (!conversationActivities.has(conversationId)) {
            conversationActivities.set(conversationId, []);
        }
        
        // CRÉER L'ACTIVITÉ DE RÉPONSE
        let responseActivity = null;
        
        if (incomingActivity.type === 'conversationUpdate') {
            responseActivity = {
                type: 'message',
                id: 'A_' + Date.now(),
                timestamp: new Date().toISOString(),
                serviceUrl: incomingActivity.serviceUrl,
                channelId: incomingActivity.channelId,
                from: { id: 'bot', name: 'Assistant' },
                conversation: incomingActivity.conversation,
                recipient: incomingActivity.from,
                text: '👋 Bonjour ! Je suis votre assistant. Tapez un message !',
                locale: 'fr-FR'
            };
        }
        else if (incomingActivity.type === 'message' && incomingActivity.text) {
            responseActivity = {
                type: 'message',
                id: 'A_' + Date.now(),
                timestamp: new Date().toISOString(),
                serviceUrl: incomingActivity.serviceUrl,
                channelId: incomingActivity.channelId,
                from: { id: 'bot', name: 'Assistant' },
                conversation: incomingActivity.conversation,
                recipient: incomingActivity.from,
                text: `🎉 RÉPONSE: Vous avez dit "${incomingActivity.text}" - Ça fonctionne !`,
                locale: 'fr-FR',
                replyToId: incomingActivity.id
            };
        }
        
        // STOCKER l'activité
        if (responseActivity) {
            const activities = conversationActivities.get(conversationId);
            activities.push(responseActivity);
            console.log('💾 Activité stockée:', responseActivity.text);
        }
    }
    
    // ⚠️ IMPORTANT : Répondre avec ResourceResponse, pas l'activité !
    const resourceResponse = {
        id: 'R_' + Date.now()  // Juste un ID
    };
    
    console.log('📤 ResourceResponse envoyé:', resourceResponse.id);
    res.send(200, resourceResponse);
    return next();
});

// ENDPOINT CRITIQUE : Web Chat récupère les activités ici
server.get('/v3/directline/conversations/:conversationId/activities', (req, res, next) => {
    const conversationId = req.params.conversationId;
    const watermark = parseInt(req.query.watermark) || 0;
    
    console.log('=== 🔄 GET ACTIVITIES ===');
    console.log('Conversation:', conversationId);
    console.log('Watermark:', watermark);
    
    if (!conversationActivities.has(conversationId)) {
        return res.send(200, {
            activities: [],
            watermark: '0'
        });
    }
    
    const activities = conversationActivities.get(conversationId);
    const newActivities = activities.slice(watermark);
    
    console.log('📦 Envoi de', newActivities.length, 'activités à Web Chat');
    
    const response = {
        activities: newActivities,
        watermark: activities.length.toString()
    };
    
    res.send(200, response);
    return next();
});

// Health check
server.get('/api/health', (req, res, next) => {
    res.json({ 
        status: 'healthy 🎯',
        timestamp: new Date().toISOString()
    });
    return next();
});

const port = process.env.PORT || 3978;
server.listen(port, () => {
    console.log('=========================================');
    console.log('🤖 BOT CORRIGÉ - FORMAT AZURE');
    console.log('📍 Port:', port);
    console.log('📍 Format: ResourceResponse + ActivitySet');
    console.log('=========================================');
});
