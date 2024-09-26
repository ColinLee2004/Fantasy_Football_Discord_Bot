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
        range: "'Stats'!C5:C",
    });

    return result.data.values;
}

async function write_to_sheet(sheets, values, week) {
    const spreadsheetId = ss_ID;
    let idx = 5 + 4 * week;
    let idx_str = idx.toString();
    const range = "'Stats'!R3:C" + idx_str;
    const valueInputOption = 'USER_ENTERED';

    const resource = { values };
    console.log('here');
    console.log(sheets);

    try {
        const res = await sheets.spreadsheets.values.update({
            spreadsheetId,
            range,
            valueInputOption,
            resource,
        });
        return; // Returns the response from the Sheets API.
    } catch (error) {
        console.error('error', error); // Logs errors.
    }
}

async function readSheet(sheets, week) {
    const metaData = await sheets.spreadsheets.values.get({
        spreadsheetId: ss_ID,
        range: "'Stats'!C3:3",
    });

    console.log(metaData.data.values[0].indexOf(week));
    return metaData.data.values[0].indexOf(week);
}

async function order_players(j_object, players_list) {
    const orderedPlayers = players_list.map((playerNameArray) => {
        const playerName = playerNameArray[0];
        const player = j_object.players.find(
            (player) => player.name === playerName
        );

        // If player exists, return the player object, else return a default object with empty fields
        return player || { name: playerName, opp: '', proj: '', score: '' };
    });

    const playersValuesList = orderedPlayers.map((player) =>
        Object.values(player)
    );

    return playersValuesList;
}

async function get_json(message) {
    let args = message.content.slice(prefix.length).split(' ');
    let command = args.shift().toLowerCase();

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
        max_tokens: 350,
        response_format: zodResponseFormat(team, 'logstats_response'),
    });

    return completion.choices[0].message.content;
}

async function create_sheet_array(message) {
    const j_string = await get_json(message);
    const parsedJsonObject = JSON.parse(j_string);

    sheets = await getAuth();

    const players_list = await getNames(sheets);

    const playerValuesList = await order_players(
        parsedJsonObject,
        players_list
    );

    let data = playerValuesList.map((sublist) => sublist.slice(1));
    data.unshift(['Opponent', 'Proj', 'Score']);

    return data;
}

// When the client is ready, run this code (only once).
// The distinction between `client: Client<boolean>` and `readyClient: Client<true>` is important for TypeScript developers.
// It makes some properties non-nullable.
client.once(Events.ClientReady, (readyClient) => {
    console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

client.on(Events.MessageCreate, async (message) => {
    if (!message.content.startsWith(prefix)) return;
    playerValuesList = await create_sheet_array(message);
    console.log(playerValuesList);
    sheets = await getAuth();
    write_to_sheet(sheets, playerValuesList, week);
});

// Log in to Discord with your client's token
client.login(process.env.DISCORD_TOKEN);
