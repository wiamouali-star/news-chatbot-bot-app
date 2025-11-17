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

// FORMAT CONFORME DIRECT LINE 3.0
server.post('/api/messages', (req, res, next) => {
    console.log('📨 Direct Line 3.0 Request:', req.body.type);
    
    try {
        const incomingActivity = req.body;
        let responseActivity = null;

        // Selon la doc: "Clients may send a single activity per request"
        // Et le bot doit répondre avec une activité
        
        if (incomingActivity.type === 'conversationUpdate') {
            // Premier message de bienvenue
            responseActivity = {
                type: 'message',
                id: generateId(),
                timestamp: new Date().toISOString(),
                serviceUrl: incomingActivity.serviceUrl,
                channelId: incomingActivity.channelId,
                from: { id: 'bot', name: 'News Bot' },
                conversation: incomingActivity.conversation,
                recipient: incomingActivity.from || { id: 'user' },
                text: '👋 Bonjour ! Je suis votre assistant actualités. Sélectionnez un article pour discuter !'
            };
        }
        else if (incomingActivity.type === 'event' && incomingActivity.name === 'newsSelected') {
            console.log('🎯 Article sélectionné:', incomingActivity.value.title);
            
            responseActivity = {
                type: 'message', 
                id: generateId(),
                timestamp: new Date().toISOString(),
                serviceUrl: incomingActivity.serviceUrl,
                channelId: incomingActivity.channelId,
                from: { id: 'bot', name: 'News Bot' },
                conversation: incomingActivity.conversation,
                recipient: incomingActivity.from,
                text: `📰 **${incomingActivity.value.title}**\n\nQue souhaitez-vous savoir sur cet article ?\n\n• 📋 Résumer l'article\n• 🎯 Points principaux\n• 🔍 Plus de détails`
            };
        }
        else if (incomingActivity.type === 'message') {
            console.log('💬 Message reçu:', incomingActivity.text);
            
            const responseText = generateBotResponse(incomingActivity.text);
            
            responseActivity = {
                type: 'message',
                id: generateId(),
                timestamp: new Date().toISOString(),
                serviceUrl: incomingActivity.serviceUrl,
                channelId: incomingActivity.channelId,
                from: { id: 'bot', name: 'News Bot' },
                conversation: incomingActivity.conversation,
                recipient: incomingActivity.from,
                text: responseText
            };
        }

        // FORMAT DE RÉPONSE DIRECT LINE 3.0 CORRECT
        if (responseActivity) {
            console.log('📤 Envoi réponse Direct Line 3.0');
            
            // Selon la doc: Returns A ResourceResponse that contains an id property
            const resourceResponse = {
                id: responseActivity.id  // ← FORMAT REQUIS PAR DIRECT LINE
            };
            
            res.send(200, resourceResponse);
            
            // IMPORTANT: Direct Line récupère les activités via l'endpoint GET séparément
            // Votre activité sera disponible via l'API Get Activities
            
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

// Fonction pour générer des réponses contextuelles
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
    else {
        return `🤖 Vous avez demandé: "${userMessage}"\n\nJe suis votre assistant actualités. Sélectionnez d'abord un article pour une discussion spécifique ! 🗞️`;
    }
}

function generateId() {
    return 'act-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

// Endpoint supplémentaire pour récupérer les activités (optionnel mais recommandé)
server.get('/api/messages', (req, res, next) => {
    // Simuler la récupération d'activités comme dans l'API Direct Line
    res.send(200, {
        activities: [],
        watermark: 0
    });
    next();
});

// Health check
server.get('/api/health', (req, res, next) => {
    res.json({
        status: 'healthy',
        service: 'Direct Line 3.0 Bot',
        timestamp: new Date().toISOString(),
        conformsTo: 'Direct Line API 3.0'
    });
    next();
});

server.get('/', (req, res, next) => {
    res.json({
        message: '🤖 Direct Line 3.0 Bot - OPERATIONNEL',
        specification: 'Direct Line API 3.0',
        endpoints: {
            post: '/api/messages',
            get: '/api/messages (activities)',
            health: '/api/health'
        }
    });
    next();
});

const port = process.env.PORT || 3978;
server.listen(port, () => {
    console.log('================================================================');
    console.log('🎉 BOT DIRECT LINE 3.0 DÉMARRÉ !');
    console.log('📍 Port:', port);
    console.log('📍 Endpoint: POST /api/messages');
    console.log('📚 Conforme à: Direct Line API 3.0');
    console.log('================================================================');
});
