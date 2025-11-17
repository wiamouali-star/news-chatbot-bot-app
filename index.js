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

// FORMAT DIRECT LINE RÉEL - SIMPLE ET EFFICACE
server.post('/api/messages', (req, res, next) => {
    console.log('📨 Direct Line Request:', req.body.type);
    
    try {
        const incomingActivity = req.body;
        let responseText = '';

        // Traitement des différents types de messages
        if (incomingActivity.type === 'conversationUpdate') {
            if (incomingActivity.membersAdded && incomingActivity.membersAdded.some(m => m.id.includes('user'))) {
                responseText = '👋 Bonjour ! Je suis votre assistant actualités. Sélectionnez un article pour discuter !';
            }
        }
        else if (incomingActivity.type === 'event' && incomingActivity.name === 'newsSelected') {
            console.log('🎯 Article sélectionné:', incomingActivity.value.title);
            responseText = `📰 **${incomingActivity.value.title}**\n\nQue souhaitez-vous savoir sur cet article ?\n\n• 📋 Résumer l'article\n• 🎯 Points principaux\n• 🔍 Plus de détails`;
        }
        else if (incomingActivity.type === 'message') {
            console.log('💬 Message reçu:', incomingActivity.text);
            responseText = generateBotResponse(incomingActivity.text);
        }

        // CRÉATION DE LA RÉPONSE DIRECT LINE CORRECTE
        const responseActivity = {
            type: 'message',
            id: generateId(),
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
            text: responseText || 'Bonjour ! Comment puis-je vous aider ?',
            locale: 'fr-FR'
        };

        console.log('📤 Envoi réponse:', responseActivity.text);

        // FORMAT DE RÉPONSE DIRECT LINE RÉEL
        // Direct Line attend l'activité complète dans la réponse
        res.send(200, responseActivity);

    } catch (error) {
        console.error('❌ Erreur:', error);
        res.send(500, {
            type: 'message',
            text: 'Désolé, une erreur est survenue. Veuillez réessayer.'
        });
    }
    
    return next();
});

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
        return '👍 De rien ! N\'hésitez pas à sélectionner d\'autres articles.';
    }
    else if (message.includes('hello')) {
        return '🤖 Hello ! Je suis votre assistant actualités. Sélectionnez un article pour discuter.';
    }
    else {
        return `🤖 Vous avez demandé: "${userMessage}"\n\nJe suis votre assistant actualités. Sélectionnez d'abord un article ! 🗞️`;
    }
}

function generateId() {
    return 'act-' + Date.now();
}

// Health check
server.get('/api/health', (req, res, next) => {
    res.json({
        status: 'healthy',
        service: 'Direct Line Bot',
        timestamp: new Date().toISOString(),
        ready: true
    });
    next();
});

// Route OPTIONS pour CORS preflight
server.opts('/api/messages', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.send(200);
    return next();
});

server.get('/', (req, res, next) => {
    res.json({
        message: '🤖 Direct Line Bot - SIMPLIFIÉ ET FONCTIONNEL',
        status: 'online',
        ready: true
    });
    next();
});

const port = process.env.PORT || 3978;
server.listen(port, () => {
    console.log('================================================================');
    console.log('🎉 BOT DIRECT LINE SIMPLIFIÉ DÉMARRÉ !');
    console.log('📍 Port:', port);
    console.log('📍 Endpoint: POST /api/messages');
    console.log('📝 Format: Activité Direct Line simple');
    console.log('================================================================');
});
