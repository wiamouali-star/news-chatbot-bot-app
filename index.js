const restify = require('restify');
const { BotFrameworkAdapter, ConversationState, MemoryStorage, ActivityHandler } = require('botbuilder');
require('dotenv').config();

// Configuration du stockage
const memoryStorage = new MemoryStorage();
const conversationState = new ConversationState(memoryStorage);
const selectedNewsProperty = conversationState.createProperty('selectedNews');

// Create adapter
// const adapter = new BotFrameworkAdapter({
//     appId: process.env.MicrosoftAppId || '',
//     appPassword: process.env.MicrosoftAppPassword || ''
// });

const adapter = new BotFrameworkAdapter({});

// Gestion d'erreur
adapter.onTurnError = async (context, error) => {
    console.error(`\n [onTurnError]: ${error}`);
    await context.sendActivity('Désolé, une erreur technique est survenue.');
    await conversationState.clear(context);
};

// Classe du bot
class NewsBot extends ActivityHandler {
    constructor() {
        super();

        this.onMembersAdded(async (context, next) => {
            const membersAdded = context.activity.membersAdded;
            for (let member of membersAdded) {
                if (member.id !== context.activity.recipient.id) {
                    await context.sendActivity("📰 **Bonjour ! Je suis votre assistant actualités.**");
                }
            }
            await next();
        });

        this.onEvent(async (context, next) => {
            console.log('Événement reçu:', context.activity.name);
            
            if (context.activity.name === 'newsSelected') {
                const news = context.activity.value;
                console.log('Article sélectionné:', news);
                
                if (!news || !news.title) {
                    await context.sendActivity("❌ Données d'article incomplètes.");
                    return await next();
                }
                
                await selectedNewsProperty.set(context, news);
                await context.sendActivity(`🎯 **Discussion sur : ${news.title}**`);
                if (news.summary) {
                    await context.sendActivity(`📖 ${news.summary}`);
                }
                await context.sendActivity("💡 *Que souhaitez-vous savoir sur ce sujet ?*");
            }
            await next();
        });

        this.onMessage(async (context, next) => {
            const userMessage = context.activity.text;
            const news = await selectedNewsProperty.get(context);

            console.log('Message reçu:', userMessage);

            if (news) {
                await context.sendActivity(`📖 **À propos de : "${news.title}"**`);
                await context.sendActivity(`❓ Vous me demandez : "${userMessage}"`);
                await this.generateContextualResponse(context, userMessage, news);
            } else {
                await context.sendActivity("👋 Veuillez sélectionner une actualité pour discuter.");
            }

            await next();
        });
    }

    async generateContextualResponse(context, userMessage, news) {
        const lowerMessage = userMessage.toLowerCase();
        
        if (lowerMessage.includes('quoi') || lowerMessage.includes('résume')) {
            await context.sendActivity(`📋 **Résumé :** ${news.summary || 'Analyse en cours...'}`);
        } 
        else if (lowerMessage.includes('pourquoi') || lowerMessage.includes('important')) {
            await context.sendActivity("🔍 **Analyse :** Cette actualité touche à des enjeux contemporains significatifs.");
        }
        else if (lowerMessage.includes('source') || lowerMessage.includes('lien')) {
            await context.sendActivity(`🔗 **Source :** ${news.url || 'URL non disponible'}`);
        }
        else {
            await context.sendActivity("💡 Cette question ouvre des perspectives intéressantes. Que souhaitez-vous approfondir ?");
        }
    }
}

const bot = new NewsBot();

// Create server
const server = restify.createServer();

// Middleware
server.use(restify.plugins.bodyParser());
server.use(restify.plugins.queryParser());

// Middleware CORS
server.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return next();
});

// ✅ ROUTE OPTIONS CORRIGÉE
server.opts('/api/messages', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.send(200);
    return next();
});

// Route pour les messages
server.post('/api/messages', async (req, res) => {
    console.log('Message reçu sur /api/messages');
    try {
        await adapter.processActivity(req, res, async (context) => {
            await bot.run(context);
            await conversationState.saveChanges(context, false);
        });
    } catch (error) {
        console.error('Erreur processActivity:', error);
        res.send(500, { error: 'Erreur interne du serveur' });
    }
});

// Route santé
server.get('/', (req, res, next) => {
    res.send(200, {
        status: 'OK',
        message: '🤖 Bot d\'actualités en fonctionnement',
        timestamp: new Date().toISOString()
    });
    return next();
});

// Route de test
server.get('/api/test', (req, res, next) => {
    res.send(200, {
        message: 'Bot endpoint test réussi',
        version: '1.0'
    });
    return next();
});

const port = process.env.PORT || 3978;
server.listen(port, () => {
    console.log(`🤖 Bot d'actualités démarré sur le port ${port}`);
    console.log(`📍 Health check: http://localhost:${port}/`);
});
