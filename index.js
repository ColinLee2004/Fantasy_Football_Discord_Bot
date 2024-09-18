// Require the necessary discord.js classes
const { Client, Events, GatewayIntentBits } = require('discord.js');
require('dotenv').config();
const OpenAI = require('openai');
const { z } = require('zod');
const { zodResponseFormat } = require('openai/helpers/zod');
const prefix = '.';

const player = z.object({
    name: z.string(),
    opp: z.string(),
    proj: z.number(),
    score: z.number(),
});

const team = z.object({
    players: z.array(player),
});

// Create a new client instance
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessages,
    ],
});

// Create an OpenAi client instance

const openaiClient = new OpenAI({
    apiKey: process.env.OPEN_AI_API_KEY,
});

// When the client is ready, run this code (only once).
// The distinction between `client: Client<boolean>` and `readyClient: Client<true>` is important for TypeScript developers.
// It makes some properties non-nullable.
client.once(Events.ClientReady, (readyClient) => {
    console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

client.on(Events.MessageCreate, async (message) => {
    //if (!message.content.startsWith(prefix)) return;
    let args = message.content.slice(prefix.length).split(' ');
    let command = args.shift().toLowerCase();

    if (command == 'logstats') {
    }
    let prompt =
        'return a JSON object containing player name, opponent, projected score, and actual score.';

    if (message.author.bot) {
        return;
    }

    let imageUrlArray = [];
    for (const [snowflake, attachment] of message.attachments) {
        imageUrlArray.push(attachment.url);
    }
    promptArray = [];
    promptArray.push({
        type: 'text',
        text: prompt,
    });
    for (let i = 0; i < imageUrlArray.length; i++) {
        promptArray.push({
            type: 'image_url',
            image_url: {
                url: imageUrlArray[i],
            },
        });
    }

    const completion = await openaiClient.chat.completions.create({
        model: 'gpt-4o',
        messages: [
            {
                role: 'user',
                content: promptArray,
                response_format: zodResponseFormat(team, 'logstats_response'),
            },
        ],
    });

    //message.reply(completion.choices[0].message.content);
    console.log(completion);
    console.log(completion.choices[0].message.content);
});

// Log in to Discord with your client's token
client.login(process.env.DISCORD_TOKEN);
