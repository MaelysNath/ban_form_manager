const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Collection } = require('discord.js');
require('dotenv').config();

// Create client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
  ],
});

client.commands = new Collection();
client.utils = require('./utils/data');
const resumeVote = require('./utils/resumeVote');
const finalizeVote = require('./utils/finalizeVote').default;
const dataUtils = require('./utils/data');

// Attacher les utilitaires au client
client.utils = {
  ...dataUtils,
  resumeVote,
  finalizeVote,
};

// Load commands
const commandFiles = fs.readdirSync('./commands').filter((file) => file.endsWith('.js'));
for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.name, command);
}

// Load events
const eventFiles = fs.readdirSync('./events').filter((file) => file.endsWith('.js'));
for (const file of eventFiles) {
  const event = require(`./events/${file}`);
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args, client));
  } else {
    client.on(event.name, (...args) => event.execute(...args, client));
  }
}

// Login to Discord
client.login(process.env.TOKEN);
