const restify = require('restify');

const server = restify.createServer();
server.use(restify.plugins.bodyParser());

server.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});

// STOCKAGE GLOBAL amélioré
const conversationActivities = new Map();

server.post('/api/messages', (req, res, next) => {
    console.log('=== 🟡 AZURE APPELÉ NOTRE BOT ! ===');
    console.log('Conversation ID:', req.body.conversation?.id);
    console.log('Message:', req.body.text);
    
    const incomingActivity = req.body;
    const conversationId = incomingActivity.conversation?.id;
    
    if (conversationId) {
        // INITIALISER la conversation
        if (!conversationActivities.has(conversationId)) {
            conversationActivities.set(conversationId, []);
            console.log('📁 Nouvelle conversation créée:', conversationId);
        }
        
        // CRÉER RÉPONSE IMMÉDIATE
        let responseText = '';
        
        if (incomingActivity.type === 'conversationUpdate') {
            responseText = '👋 Bonjour ! Je suis votre assistant. Tapez quelque chose !';
        }
        else if (incomingActivity.type === 'message' && incomingActivity.text) {
            responseText = `✅ SUCCÈS ! Vous avez dit: "${incomingActivity.text}" - Le bot fonctionne parfaitement ! 🎉`;
        }
        
        // CRÉER ET STOCKER L'ACTIVITÉ DE RÉPONSE
        const responseActivity = {
            type: 'message',
            id: 'A_' + Date.now(),
            timestamp: new Date().toISOString(),
            serviceUrl: incomingActivity.serviceUrl,
            channelId: incomingActivity.channelId,
            from: { 
                id: 'bot', 
                name: 'News Bot',
                role: 'bot'
            },
            conversation: incomingActivity.conversation,
            recipient: incomingActivity.from,
            text: responseText,
            locale: 'fr-FR',
            replyToId: incomingActivity.id
        };
        
        // STOCKER
        const activities = conversationActivities.get(conversationId);
        activities.push(responseActivity);
        
        console.log('💾 Activité stockée:', responseText);
        console.log('📊 Total activités dans cette conversation:', activities.length);
    }
    
    // RÉPONDRE IMMÉDIATEMENT AVEC ResourceResponse
    const resourceResponse = { id: 'R_' + Date.now() };
    console.log('📤 ResourceResponse envoyé à Azure');
    
    res.send(200, resourceResponse);
    return next();
});

// ENDPOINT GET - CRITIQUE
server.get('/v3/directline/conversations/:conversationId/activities', (req, res, next) => {
    const conversationId = req.params.conversationId;
    const watermark = parseInt(req.query.watermark) || 0;
    
    console.log('=== 🟢 DIRECT LINE APPELLE GET ACTIVITIES ===');
    console.log('Conversation:', conversationId);
    console.log('Watermark demandé:', watermark);
    
    if (!conversationActivities.has(conversationId)) {
        console.log('❌ Conversation non trouvée');
        return res.send(200, {
            activities: [],
            watermark: '0'
        });
    }
    
    const activities = conversationActivities.get(conversationId);
    const newActivities = activities.slice(watermark);
    
    console.log('📦 Envoi de', newActivities.length, 'activités à Direct Line');
    
    const response = {
        activities: newActivities,
        watermark: activities.length.toString()
    };
    
    res.send(200, response);
    return next();
});

// Debug endpoint
server.get('/api/debug', (req, res, next) => {
    const conversations = Array.from(conversationActivities.entries()).map(([id, activities]) => ({
        conversationId: id,
        activityCount: activities.length,
        lastActivity: activities[activities.length - 1]?.text || 'Aucune'
    }));
    
    res.json({
        totalConversations: conversationActivities.size,
        conversations: conversations,
        timestamp: new Date().toISOString()
    });
    return next();
});

server.get('/api/health', (req, res, next) => {
    res.json({ 
        status: 'healthy 🎉',
        conversations: conversationActivities.size,
        timestamp: new Date().toISOString()
    });
    return next();
});

const port = process.env.PORT || 3978;
server.listen(port, () => {
    console.log('=========================================');
    console.log('🤖 BOT ULTIME - PRÊT POUR DIRECT LINE');
    console.log('📍 Port:', port);
    console.log('📍 En attente des appels GET...');
    console.log('=========================================');
});
