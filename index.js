// Require the necessary discord.js classes
const { Client, Events, GatewayIntentBits } = require('discord.js');
require('dotenv').config();
const OpenAI = require('openai');
const { z, intersection } = require('zod');
const { zodResponseFormat } = require('openai/helpers/zod');
const prefix = '.';

const { google } = require('googleapis');
const CREDENTIALS_PATH = 'cred.json';
const ss_ID = '1cO6BT1hS2PbZ-s5xSq8GDf8i0_Wjo8wEeWy9qrAqZAw';

let authorized = false;
let sheets;

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

async function getAuth() {
    if (authorized === true) return sheets;

    const auth = new google.auth.GoogleAuth({
        keyFile: CREDENTIALS_PATH,
        scopes: 'https://www.googleapis.com/auth/spreadsheets',
    });

    const client = await auth.getClient();

    sheets = google.sheets({ version: 'v4', auth: client });

    authorized = true;
    console.log('authorized');

    return sheets;
}

async function getNames(sheets) {
    const result = await sheets.spreadsheets.values.get({
        spreadsheetId: ss_ID,
        range: "'Stats'!B2:2",
    });
    console.log(result.data.values);

    return result.data.values;
}

async function write_to_sheet(sheets, values, week) {
    const spreadsheetId = ss_ID;
    let week8 = parseInt(week);
    let idx = 4 + 4 * (week8 - 1);
    let idx_str = idx.toString();
    let range = "'Stats'!B" + idx_str;
    //const range = "'Stats'!B4"; //N6
    const valueInputOption = 'USER_ENTERED';
    console.log(`range: ${range}`);
    console.log('here');
    const resource = { values };
    try {
        const res = await sheets.spreadsheets.values.update({
            spreadsheetId,
            range,
            valueInputOption,
            resource,
        });
        return res; // Returns the response from the Sheets API.
    } catch (error) {
        console.error('error', error); // Logs errors.
    }
}

async function get_json(message) {
    console.log(message);
    let args = message.content.slice(prefix.length).split(' ');
    console.log(args);
    let command = args.shift().toLowerCase();
    const week1 = args[args.length - 1];
    console.log(typeof week1);
    console.log(week1);

    if (command == 'logstats') {
    }
    let prompt =
        'Return a JSON object containing player name, opponent, projected score, and actual score. Do not include ```json or ```';

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
        model: 'gpt-4o-mini',
        messages: [
            {
                role: 'user',
                content: promptArray,
            },
        ],
        max_tokens: 450,
        response_format: zodResponseFormat(team, 'logstats_response'),
    });
    //console.log(completion.choices[0].message.content);
    return [completion.choices[0].message.content, week1];
}

async function create_sheet_array(sheets, json_object) {
    const names = await getNames(sheets);
    const opponents = [];
    const projections = [];
    const scores = [];

    // Iterate over the playersList and match against jsonData to fill the arrays
    names[0].forEach((player) => {
        const foundPlayer = json_object.players.find((p) => p.name === player);

        if (foundPlayer) {
            opponents.push(foundPlayer.opp);
            projections.push(foundPlayer.proj);
            scores.push(foundPlayer.score);
        } else {
            // Push null or empty string if the player is not found
            opponents.push(null);
            projections.push(null);
            scores.push(null);
        }
    });

    const combinedList = [opponents, projections, scores];

    // Output the combined list
    console.log('Combined List:', combinedList);
    return combinedList;
}
const sample = [[1, 2, 3, 4]];
// When the client is ready, run this code (only once).
// The distinction between `client: Client<boolean>` and `readyClient: Client<true>` is important for TypeScript developers.
// It makes some properties non-nullable.
client.once(Events.ClientReady, (readyClient) => {
    console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

client.on(Events.MessageCreate, async (message) => {
    if (!message.content.startsWith(prefix)) return;
    sheets = await getAuth();
    const j_string_week = await get_json(message);
    const json_object = JSON.parse(j_string_week[0]);
    const combinedList = await create_sheet_array(sheets, json_object);
    console.log(j_string_week);
    const res = await write_to_sheet(sheets, combinedList, j_string_week[1]);
    console.log(res);
});

// Log in to Discord with your client's token
client.login(process.env.DISCORD_TOKEN);
