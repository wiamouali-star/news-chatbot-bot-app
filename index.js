const restify = require('restify');

const server = restify.createServer();
server.use(restify.plugins.bodyParser());

server.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});

// Stockage en mémoire pour les activités de réponse
const conversationActivities = new Map();

// ENDPOINT PRINCIPAL - POST /api/messages
server.post('/api/messages', (req, res, next) => {
    console.log('=== DIRECT LINE REQUEST ===');
    console.log('Type:', req.body.type);
    console.log('Text:', req.body.text);
    console.log('Conversation ID:', req.body.conversation?.id);
    
    try {
        const incomingActivity = req.body;
        const conversationId = incomingActivity.conversation?.id;
        
        if (!conversationId) {
            console.error('❌ Conversation ID manquant');
            return res.send(400, { error: 'Missing conversation ID' });
        }

        // Initialiser le stockage pour cette conversation
        if (!conversationActivities.has(conversationId)) {
            conversationActivities.set(conversationId, []);
        }

        let responseActivity = null;

        // CRÉER UNE ACTIVITÉ DE RÉPONSE
        if (incomingActivity.type === 'conversationUpdate') {
            responseActivity = createBotActivity(
                incomingActivity,
                '👋 Bonjour ! Je suis votre assistant actualités. Sélectionnez un article pour discuter !'
            );
        }
        else if (incomingActivity.type === 'message' && incomingActivity.text) {
            const responseText = generateBotResponse(incomingActivity.text);
            responseActivity = createBotActivity(incomingActivity, responseText);
        }

        // STOCKER L'ACTIVITÉ DE RÉPONSE
        if (responseActivity) {
            const activities = conversationActivities.get(conversationId);
            activities.push(responseActivity);
            conversationActivities.set(conversationId, activities);
            
            console.log('💾 Activité stockée:', responseActivity.text);
        }

        // RÉPONDRE AVEC ResourceResponse (comme attendu par Direct Line)
        const resourceResponse = {
            id: generateActivityId()
        };
        
        console.log('📤 ResourceResponse envoyé:', resourceResponse.id);
        res.send(200, resourceResponse);
        
    } catch (error) {
        console.error('❌ Error:', error);
        res.send(500, { 
            error: {
                code: 'ServiceError',
                message: error.message
            }
        });
    }
    
    return next();
});

// ENDPOINT CRITIQUE : RÉCUPÉRATION DES ACTIVITÉS
server.get('/v3/directline/conversations/:conversationId/activities', (req, res, next) => {
    const conversationId = req.params.conversationId;
    const watermark = parseInt(req.query.watermark) || 0;
    
    console.log('📥 GET Activities - Conversation:', conversationId, 'Watermark:', watermark);
    
    if (!conversationActivities.has(conversationId)) {
        console.log('📭 Aucune activité pour cette conversation');
        return res.send(200, {
            activities: [],
            watermark: watermark.toString()
        });
    }
    
    const activities = conversationActivities.get(conversationId);
    const newActivities = activities.slice(watermark);
    
    console.log('📦 Envoi de', newActivities.length, 'nouvelles activités');
    
    const response = {
        activities: newActivities,
        watermark: activities.length.toString()
    };
    
    res.send(200, response);
    return next();
});

// FONCTIONS UTILITAIRES
function createBotActivity(incomingActivity, text) {
    return {
        type: 'message',
        id: generateActivityId(),
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
        locale: 'fr-FR',
        replyToId: incomingActivity.id
    };
}

function generateBotResponse(userMessage) {
    const message = userMessage.toLowerCase();
    
    if (message.includes('bonjour') || message.includes('hello') || message.includes('salut')) {
        return '👋 Bonjour ! Je suis votre assistant actualités. Tapez "test" pour vérifier que tout fonctionne !';
    }
    else if (message.includes('test')) {
        return '✅ TEST RÉUSSI ! Le bot fonctionne correctement. Vous pouvez maintenant sélectionner des articles.';
    }
    else if (message.includes('quoi') || message.includes('qu\'est')) {
        return '❓ Je suis un assistant spécialisé dans les actualités.';
    }
    else {
        return `🤖 Vous avez dit: "${userMessage}"\n\nTapez "test" pour vérifier la connexion !`;
    }
}

function generateActivityId() {
    return 'A_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Health check
server.get('/api/health', (req, res, next) => {
    res.json({ 
        status: 'healthy', 
        service: 'Direct Line Bot',
        conversations: conversationActivities.size,
        timestamp: new Date().toISOString()
    });
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

server.opts('/v3/directline/conversations/:conversationId/activities', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.send(200);
    return next();
});

server.get('/', (req, res, next) => {
    res.json({
        message: '🤖 Direct Line Bot - SYSTÈME COMPLET',
        status: 'online',
        endpoints: {
            post: '/api/messages',
            get_activities: '/v3/directline/conversations/:id/activities',
            health: '/api/health'
        }
    });
    return next();
});

const port = process.env.PORT || 3978;
server.listen(port, () => {
    console.log('=========================================');
    console.log('🤖 BOT DIRECT LINE - SYSTÈME COMPLET');
    console.log('📍 Port:', port);
    console.log('📍 Stockage activités: ACTIVÉ');
    console.log('=========================================');
});
