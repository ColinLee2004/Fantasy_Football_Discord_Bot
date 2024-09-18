// Require the necessary discord.js classes
const { Client, Events, GatewayIntentBits } = require("discord.js");
require("dotenv").config();
const OpenAI = require("openai");

const prefix = ".";

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
  let args = message.content.slice(prefix.length).split(" ");
  let command = args.shift().toLowerCase();

  if (command == "logstats") {
  }
  let prompt =
    "You are a bot that will take a screen shot of a fantasy football app " +
    "and output a JSON dictionary where the keys are the players' names and the values are arrays, " +
    "where the first element is the player's projected points and the second element is the actualy " +
    "amount of points that player scored.";

  if (message.author.bot) {
    return;
  }
  const completion = await openaiClient.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: "hi",
      },
      {
        role: "user",
        content: message.content,
      },
    ],
  });

  let imageUrlArray = [];
  for (const [snowflake, attachment] of message.attachments) {
    imageUrlArray.push(attachment.url);
  }
  promptArray = [];
  promptArray.push({
    type: "text",
    text: prompt,
  });
  for (let i = 0; i < imageUrlArray.length; i++) {
    promptArray.push({
      type: "image_url",
      image_url: {
        url: imageUrlArray[i],
      },
    });
  }

  message.reply(completion.choices[0].message.content);
  message.reply(imageUrlArray[0]);
  console.log(completion);
});

// Log in to Discord with your client's token
client.login(process.env.DISCORD_TOKEN);
