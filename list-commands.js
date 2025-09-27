const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');
require('dotenv').config();

const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));
if (!process.env.DISCORD_TOKEN) return console.error('.env içinde DISCORD_TOKEN yok.');
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    const cmds = await rest.get(Routes.applicationGuildCommands(config.clientId, config.guildId));
    console.log(`Guild için ${cmds.length} kayıtlı komut:`);
    console.log(JSON.stringify(cmds, null, 2));
  } catch (err) {
    console.error('Listeleme hatası:', err);
  }
})();