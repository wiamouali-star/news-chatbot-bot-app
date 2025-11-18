const restify = require('restify');

const server = restify.createServer();
server.use(restify.plugins.bodyParser());

server.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});

const conversationActivities = new Map();
const conversationWatermarks = new Map();

// ENDPOINT POST - AVEC RÉPONSE IMMÉDIATE
server.post('/api/messages', (req, res, next) => {
    console.log('=== 🟡 POST /api/messages ===');
    console.log('Type:', req.body.type);
    console.log('Text:', req.body.text);
    
    const incomingActivity = req.body;
    const conversationId = incomingActivity.conversation?.id;
    
    if (conversationId) {
        // Initialiser la conversation
        if (!conversationActivities.has(conversationId)) {
            conversationActivities.set(conversationId, []);
            conversationWatermarks.set(conversationId, 0);
        }
        
        let responseActivity = null;
        
        // CRÉER LA RÉPONSE
        if (incomingActivity.type === 'conversationUpdate') {
            responseActivity = createBotActivity(
                incomingActivity,
                '👋 Bonjour ! Test Direct Line RÉUSSI ! Tapez "hello" pour confirmer.'
            );
        }
        else if (incomingActivity.type === 'message' && incomingActivity.text) {
            const responseText = generateBotResponse(incomingActivity.text);
            responseActivity = createBotActivity(incomingActivity, responseText);
        }
        
        // STOCKER LA RÉPONSE
        if (responseActivity) {
            const activities = conversationActivities.get(conversationId);
            activities.push(responseActivity);
            
            // INCRÉMENTER LE WATERMARK
            const currentWatermark = conversationWatermarks.get(conversationId);
            conversationWatermarks.set(conversationId, currentWatermark + 1);
            
            console.log('💾 Activité stockée. Watermark:', conversationWatermarks.get(conversationId));
        }
    }
    
    // RÉPONSE IMMÉDIATE (Direct Line attend ça)
    const resourceResponse = { id: 'R_' + Date.now() };
    console.log('📤 ResourceResponse envoyé');
    
    res.send(200, resourceResponse);
    return next();
});

// ENDPOINT GET - CRITIQUE
server.get('/v3/directline/conversations/:conversationId/activities', (req, res, next) => {
    const conversationId = req.params.conversationId;
    const watermark = parseInt(req.query.watermark) || 0;
    
    console.log('=== 🟢 GET Activities appelé ===');
    console.log('Conversation:', conversationId);
    console.log('Watermark demandé:', watermark);
    console.log('Watermark actuel:', conversationWatermarks.get(conversationId) || 0);
    
    if (!conversationActivities.has(conversationId)) {
        console.log('📭 Aucune activité pour cette conversation');
        return res.send(200, {
            activities: [],
            watermark: '0'
        });
    }
    
    const activities = conversationActivities.get(conversationId);
    const currentWatermark = conversationWatermarks.get(conversationId);
    const newActivities = activities.slice(watermark);
    
    console.log('📦 Envoi de', newActivities.length, 'nouvelles activités');
    
    const response = {
        activities: newActivities,
        watermark: currentWatermark.toString()
    };
    
    res.send(200, response);
    return next();
});

// NOUVEL ENDPOINT : SIMULER LA RÉCUPÉRATION
server.get('/api/force-get/:conversationId', (req, res, next) => {
    const conversationId = req.params.conversationId;
    
    console.log('=== 🔵 FORCE GET ===');
    
    if (!conversationActivities.has(conversationId)) {
        return res.json({ error: 'Conversation non trouvée' });
    }
    
    const activities = conversationActivities.get(conversationId);
    const watermark = conversationWatermarks.get(conversationId);
    
    res.json({
        conversationId: conversationId,
        activities: activities,
        watermark: watermark,
        count: activities.length
    });
    
    return next();
});

// FONCTIONS UTILITAIRES
function createBotActivity(incomingActivity, text) {
    return {
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
        recipient: incomingActivity.from || { id: 'user' },
        text: text,
        locale: 'fr-FR'
    };
}

function generateBotResponse(userMessage) {
    const message = userMessage.toLowerCase();
    
    if (message.includes('bonjour') || message.includes('hello')) {
        return '✅ BONJOUR ! La connexion Direct Line fonctionne ! Vous devriez voir ce message.';
    }
    else if (message.includes('test')) {
        return '🎉 TEST RÉUSSI ! Si vous voyez ce message, Direct Line récupère bien les activités.';
    }
    else {
        return `🤖 Vous avez dit: "${userMessage}"\n\n✅ Le bot fonctionne, mais Direct Line ne récupère pas les réponses.`;
    }
}

// Health
server.get('/api/health', (req, res, next) => {
    res.json({ 
        status: 'healthy', 
        conversations: conversationActivities.size,
        timestamp: new Date().toISOString()
    });
    return next();
});

server.get('/', (req, res, next) => {
    res.json({
        message: '🤖 Bot avec système complet',
        test_urls: [
            '/api/health',
            '/v3/directline/conversations/{id}/activities',
            '/api/force-get/{conversationId}'
        ]
    });
    return next();
});

const port = process.env.PORT || 3978;
server.listen(port, () => {
    console.log('=========================================');
    console.log('🤖 BOT AVEC SYSTÈME COMPLET');
    console.log('📍 Port:', port);
    console.log('📍 Test GET manuel:');
    console.log('   https://YOUR-URL/api/force-get/mRMXoZTfRjLXr3S92FJIg-fr');
    console.log('=========================================');
});
