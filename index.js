const restify = require('restify');
const { BotFrameworkAdapter, ConversationState, MemoryStorage, ActivityHandler } = require('botbuilder');
require('dotenv').config();

// Configuration du stockage
const memoryStorage = new MemoryStorage();
const conversationState = new ConversationState(memoryStorage);
const selectedNewsProperty = conversationState.createProperty('selectedNews');

// Create adapter avec gestion d'erreur améliorée
const adapter = new BotFrameworkAdapter({
    appId: process.env.MicrosoftAppId || '',
    appPassword: process.env.MicrosoftAppPassword || ''
});

// Catch-all for errors amélioré
adapter.onTurnError = async (context, error) => {
    console.error(`\n [onTurnError]: ${error}`);
    
    // Envoyer un message d'erreur à l'utilisateur
    await context.sendActivity('Désolé, une erreur technique est survenue. Veuillez réessayer.');
    
    // Effacer l'état de la conversation pour éviter les boucles d'erreur
    await conversationState.delete(context);
};

// Classe du bot - CORRECTION : ActivityHandler importé une seule fois
class NewsBot extends ActivityHandler {
    constructor() {
        super();

        // Message de bienvenue quand un utilisateur rejoint
        this.onMembersAdded(async (context, next) => {
            const membersAdded = context.activity.membersAdded;
            for (let member of membersAdded) {
                if (member.id !== context.activity.recipient.id) {
                    await context.sendActivity({
                        text: "📰 **Bonjour ! Je suis votre assistant actualités.**\n\nChoisissez une actualité et cliquez sur 'Discuter avec le bot' pour démarrer une conversation contextualisée."
                    });
                }
            }
            await next();
        });

        // Gestion des événements (quand un article est sélectionné)
        this.onEvent(async (context, next) => {
            if (context.activity.name === 'newsSelected' || context.activity.name === 'newsArticleSelected') {
                const news = context.activity.value;
                
                // Sauvegarder l'article dans l'état de la conversation
                await selectedNewsProperty.set(context, news);

                // Accuser réception et proposer des questions
                await context.sendActivity({
                    text: `🎯 **Discussion sur : ${news.title}**\n\n${news.summary || 'Je suis prêt à discuter de cette actualité avec vous.'}\n\n*Que souhaitez-vous savoir sur ce sujet ?*`
                });
            }
            await next();
        });

        // Gestion des messages texte de l'utilisateur
        this.onMessage(async (context, next) => {
            const userMessage = context.activity.text;
            const news = await selectedNewsProperty.get(context);

            if (news) {
                // Réponse contextualisée avec l'article
                await context.sendActivity({
                    text: `📖 **À propos de : "${news.title}"**\n\nVous me demandez : "${userMessage}"\n\nJe peux vous aider à analyser cette actualité, résumer les points clés, ou discuter de ses implications.`
                });
                
                // Ici vous pouvez intégrer Azure OpenAI, Cognitive Services, etc.
                // Exemple de réponse intelligente basée sur le contenu
                await this.generateContextualResponse(context, userMessage, news);
            } else {
                // Aucun article sélectionné
                await context.sendActivity({
                    text: "👋 Pour commencer, veuillez sélectionner une actualité en cliquant sur le bouton 'Discuter avec le bot' sous un article qui vous intéresse."
                });
            }

            await next();
        });
    }

    // Méthode pour générer des réponses contextualisées
    async generateContextualResponse(context, userMessage, news) {
        // Logique de réponse intelligente basée sur l'article
        const lowerMessage = userMessage.toLowerCase();
        
        if (lowerMessage.includes('quoi') || lowerMessage.includes('quoi de neuf') || lowerMessage.includes('résume')) {
            await context.sendActivity(`📋 **Résumé de l'actualité :**\n${news.summary || 'Je me concentre sur : ' + news.title}`);
        } 
        else if (lowerMessage.includes('pourquoi') || lowerMessage.includes('important')) {
            await context.sendActivity("🔍 **Analyse :** Cette actualité semble importante car elle touche à des enjeux contemporains. Je peux vous aider à en comprendre les implications.");
        }
        else if (lowerMessage.includes('source') || lowerMessage.includes('lien')) {
            await context.sendActivity(`🔗 **Source :** Vous pouvez consulter l'article complet ici : ${news.url}`);
        }
        else {
            // Réponse par défaut
            await context.sendActivity("💡 **Piste de réflexion :** Cette question ouvre des perspectives intéressantes sur le sujet. Que pensez-vous des implications de cette actualité ?");
        }
    }
}

const bot = new NewsBot();

// Create server avec CORS pour le développement
const server = restify.createServer();

// Middleware CORS pour autoriser les requêtes du frontend
server.use(restify.plugins.bodyParser());
server.use(restify.plugins.queryParser());

// Middleware CORS manuel
server.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});

// Route pour les messages Bot Framework
server.post('/api/messages', async (req, res) => {
    await adapter.processActivity(req, res, async (context) => {
        await bot.run(context);
        await conversationState.saveChanges(context, false);
    });
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

// Route de test des événements
server.get('/api/test', (req, res, next) => {
    res.send(200, {
        message: 'Endpoint de test fonctionnel',
        version: '1.0'
    });
    next();
});

const port = process.env.PORT || 3978;
server.listen(port, () => {
    console.log(`🤖 Bot d'actualités démarré sur le port ${port}`);
    console.log(`📍 Health check: http://localhost:${port}/`);
});
