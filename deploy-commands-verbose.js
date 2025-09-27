const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');
require('dotenv').config();

const root = __dirname;
const configPath = path.join(root, 'config.json');
if (!fs.existsSync(configPath)) { console.error('config.json bulunamadı.'); process.exit(1); }
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const { clientId, guildId } = config;
if (!clientId || !guildId) { console.error('config.json içinde clientId veya guildId yok.'); process.exit(1); }
if (!process.env.DISCORD_TOKEN) { console.error('.env içinde DISCORD_TOKEN yok.'); process.exit(1); }

const commands = [];
const commandsPath = path.join(root, 'commands');

function walkCommands(dir) {
  if (!fs.existsSync(dir)) return;
  for (const file of fs.readdirSync(dir)) {
    const full = path.join(dir, file);
    if (fs.statSync(full).isDirectory()) walkCommands(full);
    else if (file.endsWith('.js')) {
      try {
        delete require.cache[require.resolve(full)];
        const cmd = require(full);
        if (cmd && cmd.data && typeof cmd.data.toJSON === 'function') {
          commands.push(cmd.data.toJSON());
        } else {
          console.warn('Atlandı (uyumsuz export):', full);
        }
      } catch (e) {
        console.error('Komut yükleme hatası:', full, e);
      }
    }
  }
}

walkCommands(commandsPath);

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log(`Guild (${guildId}) için ${commands.length} komut kaydediliyor...`);
    const res = await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
    console.log('Komutlar başarıyla kaydedildi. API dönüşü:');
    console.log(JSON.stringify(res, null, 2));
  } catch (err) {
    console.error('Komut kayıt hatası:', err);
  }
})();