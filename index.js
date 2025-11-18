const restify = require('restify');

const server = restify.createServer();
server.use(restify.plugins.bodyParser());

server.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});

// ⚠️ CORRECTION : Retourner l'ACTIVITÉ COMPLÈTE, pas juste un ID
server.post('/api/messages', (req, res, next) => {
    console.log('=== 📨 MESSAGE REÇU ===');
    console.log('Text:', req.body.text);
    
    const incomingActivity = req.body;
    
    // CRÉER LA RÉPONSE COMPLÈTE
    const responseActivity = {
        type: 'message',
        id: 'A_' + Date.now(),  // ID de l'activité
        timestamp: new Date().toISOString(),
        serviceUrl: incomingActivity.serviceUrl,
        channelId: incomingActivity.channelId,
        from: { 
            id: 'bot', 
            name: 'Assistant Actualités',
            role: 'bot'
        },
        conversation: incomingActivity.conversation,
        recipient: incomingActivity.from,
        text: `🎉 RÉPONSE DU BOT ! Vous avez dit : "${incomingActivity.text}" - Ça fonctionne ! 🚀`,
        locale: 'fr-FR',
        replyToId: incomingActivity.id
    };
    
    console.log('📤 ENVOI ACTIVITÉ COMPLÈTE:', responseActivity.text);
    
    // ⚠️ IMPORTANT : Envoyer l'activité COMPLÈTE, pas un ResourceResponse
    res.send(200, responseActivity);
    return next();
});

// Health check
server.get('/api/health', (req, res, next) => {
    res.json({ 
        status: 'healthy 🎯',
        message: 'Bot avec activité complète',
        timestamp: new Date().toISOString()
    });
    return next();
});

const port = process.env.PORT || 3978;
server.listen(port, () => {
    console.log('=========================================');
    console.log('🤖 BOT CORRIGÉ - ACTIVITÉ COMPLÈTE');
    console.log('📍 Port:', port);
    console.log('📍 Envoi activité TEXTUELLE complète');
    console.log('=========================================');
});
