// logger.js
const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');

module.exports = function createLogger(client, config = {}) {
  // config tercihleri
  const logChannelId = config.logChannelId || (client?.config && client.config.logChannelId) || null;
  const writeLocal = config.writeLocal ?? true;
  const logsDir = path.join(__dirname, 'logs');

  if (writeLocal && !fs.existsSync(logsDir)) {
    try { fs.mkdirSync(logsDir, { recursive: true }); } catch (e) { /* ignore */ }
  }

  function now() {
    return new Date().toISOString();
  }

  function appendLocal(level, title, body) {
    if (!writeLocal) return;
    try {
      const file = path.join(logsDir, `${(new Date()).toISOString().slice(0,10)}.log`);
      const line = `[${now()}] [${level}] ${title} - ${typeof body === 'string' ? body : JSON.stringify(body)}\n`;
      fs.appendFile(file, line, (err) => { if (err) console.warn('Logger dosyaya yazarken hata:', err.message); });
    } catch (e) { console.warn('Logger appendLocal hatası:', e.message); }
  }

  async function sendToChannel(embed) {
    if (!logChannelId) return;
    try {
      const ch = client.channels.cache.get(logChannelId) || await client.channels.fetch(logChannelId).catch(()=>null);
      if (!ch) return;
      await ch.send({ embeds: [embed] }).catch(()=>{});
    } catch (e) {
      console.warn('Logger kanal gönderim hatası:', e?.message || e);
    }
  }

  function makeEmbed({ title = 'Log', description = '', color = 0x2f3136, fields = [], footer = '', thumbnail } = {}) {
    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description || '\u200b')
      .setColor(color)
      .setTimestamp();

    if (thumbnail) embed.setThumbnail(thumbnail);
    if (fields && fields.length) embed.addFields(fields);
    if (footer) embed.setFooter({ text: footer });
    return embed;
  }

  // Genel seviyeler
  async function info(title, description, opts = {}) {
    appendLocal('INFO', title, description);
    const embed = makeEmbed({ title, description, color: opts.color ?? 0x2ecc71, fields: opts.fields, footer: opts.footer, thumbnail: opts.thumbnail });
    await sendToChannel(embed);
  }

  async function warn(title, description, opts = {}) {
    appendLocal('WARN', title, description);
    const embed = makeEmbed({ title, description, color: opts.color ?? 0xF1C40F, fields: opts.fields, footer: opts.footer, thumbnail: opts.thumbnail });
    await sendToChannel(embed);
  }

  async function error(title, errorObj, opts = {}) {
    const desc = typeof errorObj === 'string' ? errorObj : (errorObj && errorObj.stack) ? `\`\`\`${(errorObj.stack || String(errorObj)).slice(0,1900)}\`\`\`` : JSON.stringify(errorObj);
    appendLocal('ERROR', title, desc);
    const embed = makeEmbed({ title, description: desc, color: opts.color ?? 0xE74C3C, fields: opts.fields, footer: opts.footer });
    await sendToChannel(embed);
  }

  // Moderasyon logu (ban/kick/mute/otorol vb.)
  async function moderation({ action, moderator, target, reason = 'Belirtilmedi', extra = {} }) {
    const title = `Moderasyon • ${action}`;
    const fields = [
      { name: 'Yetkili', value: `${moderator?.tag || moderator || 'Bilinmiyor'}`, inline: true },
      { name: 'Hedef', value: `${target?.tag || target || 'Bilinmiyor'}`, inline: true },
      { name: 'Sebep', value: `${reason || 'Belirtilmedi'}`, inline: false }
    ];
    if (extra && Object.keys(extra).length) {
      for (const k of Object.keys(extra).slice(0,4)) fields.push({ name: k, value: String(extra[k]).slice(0,1024), inline: false });
    }
    appendLocal('MOD', title, { moderator, target, reason, extra });
    const embed = makeEmbed({ title, color: 0x9b59b6, fields, footer: 'Moderasyon kaydı' });
    await sendToChannel(embed);
  }

  // Mesaj silinme logu
  async function messageDelete(message) {
    try {
      // Eğer partial ise fetch et
      if (message?.partial) {
        try { message = await message.fetch(); } catch (e) { /* ignore */ }
      }
      const author = message?.author;
      const channel = message?.guild ? (message.channel?.name || message.channel?.id) : 'DM';
      const short = (message?.content && message.content.length > 1000) ? message.content.slice(0,1000) + '...' : (message?.content || '[Eklenti/Pasif içerik]');
      const fields = [
        { name: 'Yazar', value: author ? `${author.tag} (${author.id})` : 'Bilinmiyor', inline: true },
        { name: 'Kanal', value: String(channel), inline: true },
        { name: 'İçerik (kısa)', value: short }
      ];
      if (message?.attachments && message.attachments.size) {
        const att = Array.from(message.attachments.values()).slice(0,3).map(a => a.url).join('\n');
        fields.push({ name: 'Ekler', value: att });
      }
      appendLocal('MSG_DELETE', `Mesaj silindi: ${author?.tag || 'Bilinmiyor'}`, short);
      const embed = makeEmbed({ title: 'Mesaj Silindi', description: `Bir mesaj silindi.`, color: 0xE74C3C, fields, footer: `Mesaj ID: ${message?.id || 'bilinmiyor'}` });
      await sendToChannel(embed);
    } catch (e) {
      appendLocal('ERROR', 'messageDelete handler hata', String(e?.stack || e));
    }
  }

  // Mesaj düzenlendi
  async function messageEdit(oldMessage, newMessage) {
    try {
      if (oldMessage?.partial) {
        try { oldMessage = await oldMessage.fetch(); } catch (e) {}
      }
      if (newMessage?.partial) {
        try { newMessage = await newMessage.fetch(); } catch (e) {}
      }
      const author = newMessage?.author || oldMessage?.author;
      const channel = newMessage?.guild ? (newMessage.channel?.name || newMessage.channel?.id) : 'DM';
      const before = (oldMessage?.content || '[Boş]').slice(0,1000);
      const after = (newMessage?.content || '[Boş]').slice(0,1000);
      appendLocal('MSG_EDIT', `Mesaj düzenlendi: ${author?.tag || 'Bilinmiyor'}`, { before, after });
      const embed = makeEmbed({
        title: 'Mesaj Düzenlendi',
        description: `Bir mesaj düzenlendi.`,
        color: 0x3498DB,
        fields: [
          { name: 'Yazar', value: author ? `${author.tag} (${author.id})` : 'Bilinmiyor', inline: true },
          { name: 'Kanal', value: String(channel), inline: true },
          { name: 'Önce', value: before || '[Boş]' },
          { name: 'Sonra', value: after || '[Boş]' }
        ],
        footer: `Mesaj ID: ${newMessage?.id || oldMessage?.id || 'bilinmiyor'}`
      });
      await sendToChannel(embed);
    } catch (e) {
      appendLocal('ERROR', 'messageEdit handler hata', String(e?.stack || e));
    }
  }

  // Slash/komut kullanımı logu
  async function commandUsage({ interaction, commandName, success = true, details = null }) {
    try {
      const user = interaction.user || interaction.member?.user;
      const guild = interaction.guild;
      const channel = interaction.channel;
      const fields = [
        { name: 'Kullanıcı', value: `${user?.tag || 'Bilinmiyor'} (${user?.id || '—'})`, inline: true },
        { name: 'Komut', value: `${commandName}`, inline: true },
        { name: 'Sunucu', value: guild ? `${guild.name} (${guild.id})` : 'DM' }
      ];
      if (channel) fields.push({ name: 'Kanal', value: `${channel.name || channel.id}`, inline: true });
      if (details) fields.push({ name: 'Detay', value: String(details).slice(0,1024) });
      appendLocal('CMD', `${commandName} kullanıldı`, { user: user?.tag, guild: guild?.name, channel: channel?.id });
      const embed = makeEmbed({ title: `Komut: ${commandName}`, color: success ? 0x2ecc71 : 0xE74C3C, fields, footer: 'Komut kullanımı' });
      await sendToChannel(embed);
    } catch (e) { appendLocal('ERROR', 'commandUsage hata', String(e?.stack || e)); }
  }

  // Interaction hata logu
  async function interactionError(interaction, error) {
    try {
      const user = interaction?.user || interaction?.member?.user;
      const guild = interaction?.guild;
      const channel = interaction?.channel;
      const stack = (error && error.stack) ? `\`\`\`${(error.stack).slice(0,1900)}\`\`\`` : String(error).slice(0,1900);
      appendLocal('INTERACTION_ERR', `Interaction error by ${user?.tag}`, stack);
      const fields = [
        { name: 'Kullanıcı', value: `${user?.tag || 'Bilinmiyor'} (${user?.id || '—'})`, inline: true },
        { name: 'Komut/CustomId', value: `${interaction?.commandName || interaction?.customId || '—'}`, inline: true },
        { name: 'Sunucu', value: guild ? `${guild.name} (${guild.id})` : 'DM' }
      ];
      if (channel) fields.push({ name: 'Kanal', value: `${channel.name || channel.id}`, inline: true });
      const embed = makeEmbed({ title: 'Interaction Hatası', description: stack, color: 0xE74C3C, fields, footer: 'Hata ayrıntıları' });
      await sendToChannel(embed);
    } catch (e) { appendLocal('ERROR', 'interactionError hatası', String(e?.stack || e)); }
  }

  // Process hataları için kullan
  async function processError(type, err) {
    appendLocal('PROCESS_' + type, err?.stack || String(err));
    const embed = makeEmbed({ title: `Process ${type}`, description: `\`\`\`${String(err?.stack || err).slice(0,1900)}\`\`\``, color: 0xE74C3C });
    await sendToChannel(embed);
  }

  // public API
  return {
    info,
    warn,
    error,
    moderation,
    messageDelete,
    messageEdit,
    commandUsage,
    interactionError,
    processError,
    appendLocal
  };
};
