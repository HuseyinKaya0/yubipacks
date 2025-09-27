const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');
require('dotenv').config();

const root = __dirname;
const cfgPath = path.join(root, 'config.json');
if (!fs.existsSync(cfgPath)) return console.error('config.json bulunamadı.');
const config = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
const { clientId, guildId } = config;
if (!clientId || !guildId) return console.error('config.json içinde clientId veya guildId eksik.');
if (!process.env.DISCORD_TOKEN) return console.error('.env içinde DISCORD_TOKEN yok.');

const commands = [];
const cmdsDir = path.join(root, 'commands');
function load(dir) {
  if (!fs.existsSync(dir)) return;
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) load(full);
    else if (f.endsWith('.js')) {
      try {
        delete require.cache[require.resolve(full)];
        const cmd = require(full);
        if (cmd?.data?.toJSON) commands.push(cmd.data.toJSON());
        else console.warn('Atlandı (uyumsuz):', full);
      } catch (e) {
        console.error('Komut yükleme hatası:', full, e);
      }
    }
  }
}
load(cmdsDir);

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log(`Guild (${guildId}) için ${commands.length} komut kaydediliyor...`);
    const res = await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
    console.log('Komutlar başarıyla kaydedildi.');
    console.log(JSON.stringify(res, null, 2));
  } catch (err) {
    console.error('Komut kayıt hatası:', err);
  }
})();