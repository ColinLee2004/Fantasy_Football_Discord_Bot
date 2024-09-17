// Require the necessary discord.js classes
const { Client, Events, GatewayIntentBits } = require('discord.js');
require('dotenv').config();

const prefix = '.';

// Create a new client instance
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMessages] });

// When the client is ready, run this code (only once).
// The distinction between `client: Client<boolean>` and `readyClient: Client<true>` is important for TypeScript developers.
// It makes some properties non-nullable.
client.once(Events.ClientReady, readyClient => {
	console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

client.on(Events.MessageCreate, message => {
    //if (!message.content.startsWith(prefix)) return;
    let args = message.content.slice(prefix.length).split(' ');
    let command = args.shift().toLowerCase();

    if (command == 'logstats') {


    }

    console.log(message);
});


// Log in to Discord with your client's token
client.login(process.env.DISCORD_TOKEN);