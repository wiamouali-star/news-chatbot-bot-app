const restify = require('restify');
const { BotFrameworkAdapter, ConversationState, MemoryStorage, ActivityHandler } = require('botbuilder');
require('dotenv').config();

// Configuration du stockage
const memoryStorage = new MemoryStorage();
const conversationState = new ConversationState(memoryStorage);
const selectedNewsProperty = conversationState.createProperty('selectedNews');

// Create adapter avec configuration simplifiée pour développement
const adapter = new BotFrameworkAdapter({
    appId: process.env.MicrosoftAppId || '',
    appPassword: process.env.MicrosoftAppPassword || ''
});

// Gestion d'erreur améliorée
adapter.onTurnError = async (context, error) => {
    console.error(`\n [onTurnError]: ${error}`);
    
    try {
        // Envoyer un message d'erreur à l'utilisateur
        await context.sendActivity('Désolé, une erreur technique est survenue. Veuillez réessayer.');
        
        // Effacer l'état de la conversation
        await conversationState.clear(context);
    } catch (err) {
        console.error('Erreur dans onTurnError:', err);
    }
};

// Classe du bot
class NewsBot extends ActivityHandler {
    constructor() {
        super();

        // Message de bienvenue
        this.onMembersAdded(async (context, next) => {
            try {
                const membersAdded = context.activity.membersAdded;
                for (let member of membersAdded) {
                    if (member.id !== context.activity.recipient.id) {
                        await context.sendActivity("📰 **Bonjour ! Je suis votre assistant actualités.** Choisissez une actualité pour démarrer une discussion.");
                    }
                }
            } catch (error) {
                console.error('Erreur onMembersAdded:', error);
            }
            await next();
        });

        // Gestion des événements (article sélectionné) - CORRIGÉE
        this.onEvent(async (context, next) => {
            try {
                console.log('Événement reçu:', context.activity.name);
                
                if (context.activity.name === 'newsSelected') {
                    const news = context.activity.value;
                    
                    // VALIDATION DES DONNÉES
                    if (!news || !news.title) {
                        await context.sendActivity("❌ Données d'article incomplètes.");
                        return await next();
                    }
                    
                    console.log('Article sélectionné:', news);
                    
                    // Sauvegarder l'article
                    await selectedNewsProperty.set(context, news);

                    // Accuser réception
                    await context.sendActivity(`🎯 **Discussion sur : ${news.title}**`);
                    if (news.summary) {
                        await context.sendActivity(`📖 ${news.summary}`);
                    }
                    await context.sendActivity("💡 *Que souhaitez-vous savoir sur ce sujet ?*");
                }
            } catch (error) {
                console.error('Erreur onEvent:', error);
                await context.sendActivity("❌ Erreur lors du traitement de l'article.");
            }
            await next();
        });

        // Gestion des messages - CORRIGÉE
        this.onMessage(async (context, next) => {
            try {
                const userMessage = context.activity.text;
                const news = await selectedNewsProperty.get(context);

                console.log('Message reçu:', userMessage);
                console.log('Article en cours:', news);

                if (news) {
                    // Réponse contextualisée
                    await context.sendActivity(`📖 **À propos de : "${news.title}"**`);
                    await context.sendActivity(`❓ Vous me demandez : "${userMessage}"`);
                    
                    // Réponse intelligente basée sur le contenu
                    await this.generateContextualResponse(context, userMessage, news);
                } else {
                    // Aucun article sélectionné
                    await context.sendActivity("👋 Pour commencer, veuillez sélectionner une actualité en cliquant sur 'Discuter avec le bot' sous un article.");
                }
            } catch (error) {
                console.error('Erreur onMessage:', error);
                await context.sendActivity("❌ Erreur lors du traitement de votre message.");
            }

            await next();
        });
    }

    // Méthode pour générer des réponses contextualisées
    async generateContextualResponse(context, userMessage, news) {
        try {
            const lowerMessage = userMessage.toLowerCase();
            
            if (lowerMessage.includes('quoi') || lowerMessage.includes('résume') || lowerMessage.includes('explique')) {
                await context.sendActivity(`📋 **Résumé :** ${news.summary || 'Cette actualité mérite une analyse approfondie.'}`);
            } 
            else if (lowerMessage.includes('pourquoi') || lowerMessage.includes('important')) {
                await context.sendActivity("🔍 **Analyse :** Cette actualité semble importante car elle touche à des enjeux contemporains significatifs.");
            }
            else if (lowerMessage.includes('source') || lowerMessage.includes('lien')) {
                await context.sendActivity(`🔗 **Source :** ${news.url || 'URL non disponible'}`);
            }
            else if (lowerMessage.includes('avis') || lowerMessage.includes('pense')) {
                await context.sendActivity("💭 **Réflexion :** En tant qu'assistant, je peux vous aider à analyser les différents angles de cette actualité.");
            }
            else {
                await context.sendActivity("💡 **Piste :** Cette question ouvre des perspectives intéressantes. Que souhaitez-vous approfondir ?");
            }
        } catch (error) {
            console.error('Erreur generateContextualResponse:', error);
            await context.sendActivity("💡 Je suis prêt à discuter de cet article avec vous.");
        }
    }
}

const bot = new NewsBot();

// Create server
const server = restify.createServer();

// Middleware CORS
server.use(restify.plugins.bodyParser());
server.use(restify.plugins.queryParser());

// Middleware CORS manuel - AMÉLIORÉ
server.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    next();
});

// Gestion OPTIONS pour CORS - NOUVEAU
server.opts('/api/messages', (req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.send(200);
});

// Route pour les messages Bot Framework - CORRIGÉE
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
    next();
});

// Route de test
server.get('/api/test', (req, res, next) => {
    res.send(200, {
        message: 'Bot endpoint test réussi',
        version: '1.0'
    });
    next();
});

// Gestion des erreurs globales du serveur
server.on('uncaughtException', (req, res, route, err) => {
    console.error('Uncaught Exception:', err);
    res.send(500, { error: 'Erreur interne du serveur' });
});

const port = process.env.PORT || 3978;
server.listen(port, () => {
    console.log(`🤖 Bot d'actualités démarré sur le port ${port}`);
    console.log(`📍 Health check: http://localhost:${port}/`);
    console.log(`📍 Messages endpoint: http://localhost:${port}/api/messages`);
});
