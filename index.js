const restify = require('restify');

const server = restify.createServer();
server.use(restify.plugins.bodyParser());

server.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});

// FORMAT EXACT ATTENDU PAR DIRECT LINE
server.post('/api/messages', (req, res, next) => {
    console.log('=== DIRECT LINE REQUEST ===');
    console.log('Type:', req.body.type);
    console.log('Channel:', req.body.channelId);
    console.log('Conversation ID:', req.body.conversation?.id);
    
    try {
        const incomingActivity = req.body;
        
        // 1. TOUJOURS répondre avec un ResourceResponse contenant un ID
        const resourceResponse = {
            id: generateActivityId()
        };
        
        console.log('=== SENDING RESOURCE RESPONSE ===');
        console.log('Resource ID:', resourceResponse.id);
        
        // 2. Envoyer IMMÉDIATEMENT la réponse ResourceResponse
        res.send(200, resourceResponse);
        
        // 3. ENSUITE, envoyer l'activité de réponse via une autre méthode
        // Mais d'abord, testons si juste le ResourceResponse suffit
        
        console.log('✅ ResourceResponse envoyé à Direct Line');
        
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

// ENDPOINT POUR RÉCUPÉRER LES ACTIVITÉS (comme dans le code Direct Line)
server.get('/v3/directline/conversations/:conversationId/activities', (req, res, next) => {
    const conversationId = req.params.conversationId;
    const watermark = req.query.watermark || '0';
    
    console.log('📥 GET Activities for conversation:', conversationId);
    console.log('📥 Watermark:', watermark);
    
    // Simuler une réponse avec des activités
    const activitySet = {
        activities: [
            {
                type: 'message',
                id: generateActivityId(),
                timestamp: new Date().toISOString(),
                serviceUrl: 'https://directline.botframework.com/',
                channelId: 'directline',
                from: { id: 'bot', name: 'News Bot' },
                conversation: { id: conversationId },
                recipient: { id: 'user' },
                text: '🤖 BOT TEST: Ceci est une réponse simulée !',
                locale: 'fr-FR'
            }
        ],
        watermark: '1'
    };
    
    res.send(200, activitySet);
    return next();
});

// Health check
server.get('/api/health', (req, res, next) => {
    res.json({ 
        status: 'healthy', 
        service: 'Direct Line Bot',
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

server.get('/', (req, res, next) => {
    res.json({
        message: '🤖 Direct Line Bot - FORMAT CORRIGÉ',
        endpoints: {
            post: '/api/messages',
            get_activities: '/v3/directline/conversations/:id/activities',
            health: '/api/health'
        }
    });
    return next();
});

function generateActivityId() {
    return 'A_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

const port = process.env.PORT || 3978;
server.listen(port, () => {
    console.log('=========================================');
    console.log('🤖 BOT DIRECT LINE - FORMAT CORRIGÉ');
    console.log('📍 Port:', port);
    console.log('📍 Format: ResourceResponse + ActivitySet');
    console.log('=========================================');
});
