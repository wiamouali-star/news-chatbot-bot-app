const restify = require('restify');
const { BotFrameworkAdapter } = require('botbuilder');
require('dotenv').config();

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

// Create the bot logic
const { ActivityHandler } = require('botbuilder');

class MyBot extends ActivityHandler {
    constructor() {
        super();
        this.onMessage(async (context, next) => {
            await context.sendActivity(`Echo: ${context.activity.text}`);
            await next();
        });
    }
}

const bot = new MyBot();

// Create server
let server = restify.createServer();
server.listen(3978, function () {
    console.log(`Bot running on port 3978`);
});

// Listen for incoming requests
server.post('/api/messages', async (req, res) => {
    await adapter.processActivity(req, res, async (context) => {
        await bot.run(context);
    });
});
