const restify = require('restify');

const server = restify.createServer();
server.use(restify.plugins.bodyParser());
server.use(restify.plugins.queryParser());

// CORS pour Direct Line
server.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});

// Stockage en mémoire pour les activités (en production, utilisez une base de données)
const conversationActivities = new Map();

// FORMAT DIRECT LINE 3.0 COMPLET
server.post('/api/messages', (req, res, next) => {
    console.log('📨 Direct Line 3.0 Request:', req.body.type);
    
    try {
        const incomingActivity = req.body;
        const conversationId = incomingActivity.conversation?.id;
        
        if (!conversationId) {
            console.error('❌ Conversation ID manquant');
            return res.send(400, { error: 'Conversation ID required' });
        }

        // Initialiser le stockage pour cette conversation si nécessaire
        if (!conversationActivities.has(conversationId)) {
            conversationActivities.set(conversationId, []);
        }

        let responseActivity = null;

        // Traiter les différents types d'activités
        if (incomingActivity.type === 'conversationUpdate') {
            if (incomingActivity.membersAdded && incomingActivity.membersAdded.some(m => m.id.includes('user'))) {
                responseActivity = createBotActivity(
                    incomingActivity,
                    '👋 Bonjour ! Je suis votre assistant actualités. Sélectionnez un article pour discuter !'
                );
            }
        }
        else if (incomingActivity.type === 'event' && incomingActivity.name === 'newsSelected') {
            console.log('🎯 Article sélectionné:', incomingActivity.value.title);
            
            responseActivity = createBotActivity(
                incomingActivity,
                `📰 **${incomingActivity.value.title}**\n\nQue souhaitez-vous savoir sur cet article ?\n\n• 📋 Résumer l'article\n• 🎯 Points principaux\n• 🔍 Plus de détails`
            );
        }
        else if (incomingActivity.type === 'message') {
            console.log('💬 Message reçu:', incomingActivity.text);
            
            const responseText = generateBotResponse(incomingActivity.text);
            responseActivity = createBotActivity(incomingActivity, responseText);
        }

        // Stocker l'activité de réponse si elle existe
        if (responseActivity) {
            const activities = conversationActivities.get(conversationId);
            activities.push(responseActivity);
            conversationActivities.set(conversationId, activities);
            
            console.log('📤 Activité stockée:', responseActivity.text.substring(0, 50) + '...');
            
            // Répondre avec le ResourceResponse requis
            const resourceResponse = {
                id: responseActivity.id
            };
            
            res.send(200, resourceResponse);
        } else {
            // Réponse vide mais valide
            res.send(200, { id: generateId() });
        }
        
    } catch (error) {
        console.error('❌ Erreur Direct Line 3.0:', error);
        res.send(500, {
            error: {
                code: 'ServiceError',
                message: error.message
            }
        });
    }
    
    return next();
});

// ENDPOINT GET POUR RÉCUPÉRER LES ACTIVITÉS (CRITIQUE)
server.get('/v3/directline/conversations/:conversationId/activities', (req, res, next) => {
    const conversationId = req.params.conversationId;
    const watermark = parseInt(req.query.watermark) || 0;
    
    console.log('📥 Récupération activités pour conversation:', conversationId, 'watermark:', watermark);
    
    if (!conversationActivities.has(conversationId)) {
        return res.send(200, {
            activities: [],
            watermark: watermark
        });
    }
    
    const activities = conversationActivities.get(conversationId);
    const newActivities = activities.slice(watermark);
    
    console.log('📦 Envoi', newActivities.length, 'nouvelles activités');
    
    res.send(200, {
        activities: newActivities,
        watermark: activities.length
    });
    
    return next();
});

// ENDPOINT SIMPLIFIÉ POUR WEBCHAT (compatibilité)
server.get('/api/conversations/:conversationId/activities', (req, res, next) => {
    const conversationId = req.params.conversationId;
    const watermark = parseInt(req.query.watermark) || 0;
    
    if (!conversationActivities.has(conversationId)) {
        return res.send(200, {
            activities: [],
            watermark: watermark
        });
    }
    
    const activities = conversationActivities.get(conversationId);
    const newActivities = activities.slice(watermark);
    
    res.send(200, {
        activities: newActivities,
        watermark: activities.length
    });
    
    return next();
});

// Fonction utilitaire pour créer des activités de bot
function createBotActivity(incomingActivity, text) {
    return {
        type: 'message',
        id: generateId(),
        timestamp: new Date().toISOString(),
        serviceUrl: incomingActivity.serviceUrl,
        channelId: incomingActivity.channelId,
        from: { id: 'bot', name: 'News Bot' },
        conversation: incomingActivity.conversation,
        recipient: incomingActivity.from || { id: 'user' },
        text: text,
        replyToId: incomingActivity.id
    };
}

function generateBotResponse(userMessage) {
    const message = userMessage.toLowerCase();
    
    if (message.includes('bonjour') || message.includes('hello') || message.includes('salut')) {
        return '👋 Bonjour ! Sélectionnez un article actualités pour commencer une discussion.';
    }
    else if (message.includes('résum') || message.includes('resum')) {
        return '📋 Je peux vous aider à résumer les articles que vous sélectionnez. Choisissez un article dans la liste !';
    }
    else if (message.includes('quoi') || message.includes('qu\'est')) {
        return '❓ Je suis un assistant spécialisé dans les actualités. Je peux discuter des articles que vous sélectionnez.';
    }
    else if (message.includes('merci')) {
        return '👍 De rien ! N\'hésitez pas à sélectionner d\'autres articles pour continuer la discussion.';
    }
    else if (message.includes('hello')) {
        return '🤖 Hello ! Je suis votre assistant actualités. Sélectionnez un article pour discuter de son contenu.';
    }
    else {
        return `🤖 Vous avez demandé: "${userMessage}"\n\nJe suis votre assistant actualités. Sélectionnez d'abord un article pour une discussion spécifique ! 🗞️`;
    }
}

function generateId() {
    return 'act-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

// Health check
server.get('/api/health', (req, res, next) => {
    res.json({
        status: 'healthy',
        service: 'Direct Line 3.0 Bot',
        timestamp: new Date().toISOString(),
        activeConversations: conversationActivities.size
    });
    next();
});

server.get('/', (req, res, next) => {
    res.json({
        message: '🤖 Direct Line 3.0 Bot - AVEC STOCKAGE ACTIVITÉS',
        endpoints: {
            post: '/api/messages',
            get_activities: '/v3/directline/conversations/:id/activities',
            get_activities_simple: '/api/conversations/:id/activities',
            health: '/api/health'
        }
    });
    next();
});

const port = process.env.PORT || 3978;
server.listen(port, () => {
    console.log('================================================================');
    console.log('🎉 BOT DIRECT LINE 3.0 AVEC STOCKAGE DÉMARRÉ !');
    console.log('📍 Port:', port);
    console.log('📍 Endpoints:');
    console.log('   POST /api/messages');
    console.log('   GET  /v3/directline/conversations/:id/activities');
    console.log('   GET  /api/conversations/:id/activities');
    console.log('================================================================');
});
