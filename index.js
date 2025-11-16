const restify = require('restify');
const { BotFrameworkAdapter } = require('botbuilder');
require('dotenv').config();

const { ActivityHandler, ConversationState, MemoryStorage } = require('botbuilder');

const memoryStorage = new MemoryStorage();
const conversationState = new ConversationState(memoryStorage);
const selectedNewsProperty = conversationState.createProperty('selectedNews');


// Create adapter
const adapter = new BotFrameworkAdapter({
    appId: process.env.MicrosoftAppId,
    appPassword: process.env.MicrosoftAppPassword
});


// Catch-all for errors
adapter.onTurnError = async (context, error) => {
    console.error(`\n [onTurnError]: ${ error }`);
    await context.sendActivity('Oops! Something went wrong.');
};


class MyBot extends ActivityHandler {
    constructor() {
        super();

        // Quand un event arrive (comme newsSelected)
        this.onEvent(async (context, next) => {
            if (context.activity.name === 'newsSelected') {
                const news = context.activity.value; // { id, title, url }

                await selectedNewsProperty.set(context, news);

                await context.sendActivity(
                    `On va parler de cette actualité : **${ news.title }**.\n\n` +
                    `Tu peux me poser des questions sur cette news.`
                );
            }

            await next();
        });

        // Quand l'utilisateur envoie un message texte
        this.onMessage(async (context, next) => {
            const news = await selectedNewsProperty.get(context);

            if (news) {
                await context.sendActivity(
                    `Tu m'as demandé : "${context.activity.text}".\n\n` +
                    `Cette question concerne la news : **${ news.title }** (${ news.url }).`
                );
                // ➜ ici, tu peux appeler une API, résumer l’article, etc.
            } else {
                await context.sendActivity(
                    `Dis-moi d'abord sur quelle news tu veux parler en cliquant sur "Discuter avec le bot" sur une actualité.`
                );
            }

            await next();
        });

        // Optionnel : message de bienvenue
        this.onMembersAdded(async (context, next) => {
            await context.sendActivity("Bonjour ! Choisis une actualité et clique sur le bouton pour qu'on en parle.");
            await next();
        });
    }
}


const bot = new MyBot();

// Create server
let server = restify.createServer();
const port = process.env.PORT || 3978;   // 3978 pour tes tests locaux
server.listen(port, () => {
    console.log(`Bot running on port ${port}`);
});


// Listen for incoming requests
server.post('/api/messages', async (req, res) => {
    await adapter.processActivity(req, res, async (context) => {
        await bot.run(context);
        await conversationState.saveChanges(context, false);
    });
});


server.get('/', (req, res, next) => {
    res.send(200, 'Bot is running');
    next();
});
