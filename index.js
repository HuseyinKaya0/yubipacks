// index.js — Tam entegre (logger, reklam engel, canvas, ticket, pack menü, komut loader)
const fs = require('fs');
const path = require('path');
const Canvas = require('canvas');
require('dotenv').config();

const {
  Client,
  Collection,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ChannelType,
  AttachmentBuilder,
  PermissionFlagsBits
} = require('discord.js');

// ---------- CONFIG YÜKLE ----------
const configPath = path.join(__dirname, 'config.json');
let config = {};
try { config = JSON.parse(fs.readFileSync(configPath, 'utf8')); } catch (e) { config = {}; }
const ALLOWED_GUILD_ID = config.guildId || null;

// ---------- CLIENT ----------
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});
client.commands = new Collection();
client.config = config; // referans

// ---------- LOGGER ENTEGRE ET ----------
let logger = null;
try {
  logger = require('./logger')(client, config);
  client.logger = logger;
  console.log('Logger entegre edildi.');
} catch (e) {
  console.warn('Logger yüklenemedi:', e?.message || e);
}

// ---------- sendLog (geri uyumluluk için yardımcı) ----------
async function sendLogWrapper(opts) {
  try {
    if (client.logger && typeof client.logger.info === 'function') {
      // warn/info seçimi: opts.color ile belirleyebiliriz; default info
      const title = opts.title || 'Log';
      const desc = opts.description || '';
      const fields = opts.fields || [];
      if (opts.color && Number(opts.color) === 0xED4245) {
        await client.logger.warn(title, desc, { fields, footer: opts.footer, thumbnail: opts.image });
      } else {
        await client.logger.info(title, desc, { fields, footer: opts.footer, thumbnail: opts.image });
      }
    } else {
      // fallback: konsola bas
      console.log('LOG:', opts.title, opts.description);
    }
  } catch (e) {
    console.warn('sendLogWrapper hata:', e?.message || e);
  }
}

// ---------- FONT (opsiyonel) ----------
try {
  const fontPath = path.join(__dirname, 'fonts', 'MedievalSharp-Regular.ttf');
  if (fs.existsSync(fontPath)) {
    Canvas.registerFont(fontPath, { family: 'MedievalSharp' });
    console.log('Özel font yüklendi: MedievalSharp');
  }
} catch (e) {
  console.warn('Font yüklemede hata:', e.message);
}

// ---------- CANVAS HELPERS ----------
function fitText(ctx, text, maxWidth, startingSize = 48, fontFamily = 'Sans') {
  let fontSize = startingSize;
  do {
    ctx.font = `bold ${fontSize}px ${fontFamily}`;
    if (ctx.measureText(text).width <= maxWidth) break;
    fontSize -= 2;
  } while (fontSize > 10);
  return ctx.font;
}

async function createMemberCanvas(member) {
  const bgPath = path.join(__dirname, 'arkaplaneyy.png');
  let bgImage = null;
  try { bgImage = await Canvas.loadImage(bgPath); } catch (e) { bgImage = null; }

  const width = bgImage ? bgImage.width : 900;
  const height = bgImage ? bgImage.height : 260;

  const canvas = Canvas.createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  if (bgImage) ctx.drawImage(bgImage, 0, 0, width, height);
  else {
    const g = ctx.createLinearGradient(0, 0, width, height);
    g.addColorStop(0, '#1f2937');
    g.addColorStop(1, '#111827');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);
  }

  const avatarSize = Math.round(Math.min(height * 0.7, 180));
  const avatarX = 30;
  const avatarY = Math.round((height / 2) - (avatarSize / 2));
  let avatarImg = null;
  try {
    avatarImg = await Canvas.loadImage(member.user.displayAvatarURL({ extension: 'png', size: 1024 }));
  } catch (e) { avatarImg = null; }

  if (avatarImg) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2 + 8, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatarImg, avatarX, avatarY, avatarSize, avatarSize);
    ctx.restore();
  } else {
    ctx.fillStyle = '#cccccc';
    ctx.fillRect(avatarX, avatarY, avatarSize, avatarSize);
  }

  const fontFamily = (fs.existsSync(path.join(__dirname, 'fonts', 'MedievalSharp-Regular.ttf')) ? 'MedievalSharp' : 'Sans');
  const nameX = Math.round(width / 2);
  const nameY = Math.round(height / 2 + avatarSize / 8);
  const nameMaxWidth = Math.round(width - 160);

  ctx.textAlign = 'center';
  ctx.font = fitText(ctx, member.user.username, nameMaxWidth, 48, fontFamily);

  ctx.lineJoin = 'round';
  ctx.lineWidth = 8;
  ctx.strokeStyle = '#ffffff';
  ctx.strokeText(member.user.username, nameX, nameY);

  ctx.fillStyle = '#000000';
  ctx.fillText(member.user.username, nameX, nameY);

  try {
    const memberCount = member.guild.memberCount;
    ctx.font = '16px Sans';
    ctx.fillStyle = '#222222';
    ctx.fillText(`Üye • #${memberCount}`, nameX, height - 18);
  } catch (e) {}

  return new AttachmentBuilder(canvas.toBuffer(), { name: `member.png` });
}

// ---------- GUILD MEMBER EVENTS ----------
client.on('guildMemberAdd', async (member) => {
  try {
    if (ALLOWED_GUILD_ID && member.guild.id !== ALLOWED_GUILD_ID) return;

    // Otorol
    const autoRoleId = client.config.autoRoleId || client.config.joinRoleId || null;
    if (autoRoleId) {
      try {
        const role = await member.guild.roles.fetch(autoRoleId).catch(() => null);
        if (role) await member.roles.add(role).catch(err => console.warn('Otorol verilemedi:', err.message));
        if (client.logger) client.logger.moderation({ action: 'OTOROL', moderator: client.user.tag, target: member.user.tag, reason: 'Otomatik rol verildi' });
      } catch (e) { console.warn('Otorol hata:', e.message); }
    }

    const channelId = client.config.welcomeChannelId || client.config.welcomeChannel || null;
    if (!channelId) return;
    const channel = member.guild.channels.cache.get(channelId) || await member.guild.channels.fetch(channelId).catch(() => null);
    if (!channel) return;

    const attachment = await createMemberCanvas(member);
    await channel.send({ content: `🎉 Aramıza hoşgeldin <@${member.id}>!`, files: [attachment] }).catch(() => {});
    if (client.logger) client.logger.info('Üye Katıldı', `${member.user.tag} katıldı.`, { thumbnail: member.user.displayAvatarURL() });
  } catch (err) {
    console.error('guildMemberAdd hatası:', err);
    if (client.logger) client.logger.interactionError(member, err);
  }
});

client.on('guildMemberRemove', async (member) => {
  try {
    if (ALLOWED_GUILD_ID && member.guild.id !== ALLOWED_GUILD_ID) return;
    const channelId = client.config.leaveChannelId || client.config.goodbyeChannelId || client.config.leaveChannel || null;
    if (!channelId) return;
    const channel = member.guild.channels.cache.get(channelId) || await member.guild.channels.fetch(channelId).catch(() => null);
    if (!channel) return;

    const attachment = await createMemberCanvas(member);
    await channel.send({ content: `😢 Görüşürüz <@${member.id}>!`, files: [attachment] }).catch(() => {});
    if (client.logger) client.logger.info('Üye Ayrıldı', `${member.user.tag} ayrıldı.`, { thumbnail: member.user.displayAvatarURL() });
  } catch (err) {
    console.error('guildMemberRemove hatası:', err);
    if (client.logger) client.logger.interactionError(member, err);
  }
});

// ---------- Komut loader ----------
const commandsPath = path.join(__dirname, 'commands');
function walkCommands(dir) {
  if (!fs.existsSync(dir)) return;
  for (const file of fs.readdirSync(dir)) {
    const full = path.join(dir, file);
    if (fs.statSync(full).isDirectory()) walkCommands(full);
    else if (file.endsWith('.js')) {
      try {
        delete require.cache[require.resolve(full)];
        const cmd = require(full);
        const name = cmd.data?.name || cmd.name;
        if (name && typeof cmd.execute === 'function') client.commands.set(name, cmd);
      } catch (e) {
        console.error('Komut yükleme hatası:', full, e);
        if (client.logger) client.logger.error('Komut yükleme hatası', e);
      }
    }
  }
}
walkCommands(commandsPath);

// ---------- READY ----------
client.once('ready', () => {
  console.log(`✅ Giriş yapıldı: ${client.user.tag}`);
  if (client.logger) client.logger.info('Bot Başlatıldı', `Kullanıcı: ${client.user.tag}`);
});

// ---------- messageCreate (reklam engelleme eklendi) ----------
client.on('messageCreate', async (msg) => {
  try {
    if (msg.author?.bot) return;
    if (msg.channel.type === ChannelType.DM) return;

    // ---------- REKLAM ENGELLEME ----------
    const exemptChannelId = client.config.adExemptChannelId || client.config.adExemptChannel || null;
    const isExemptChannel = exemptChannelId && msg.channel.id === exemptChannelId;

    if (!isExemptChannel) {
      const adRegex = /(https?:\/\/\S+|www\.\S+|discord(?:\.gg|app\.com\/invite)\/\S+|\b\+?\d{7,}\b)/i;

      let hasAd = false;
      if (adRegex.test(msg.content || '')) hasAd = true;

      if (!hasAd && msg.attachments && msg.attachments.size > 0) {
        for (const att of msg.attachments.values()) {
          if (att.url && adRegex.test(att.url)) { hasAd = true; break; }
        }
      }

      let isBypass = false;
      try {
        const bypassRoleId = client.config.adBypassRoleId || null;
        const member = msg.member;
        if (member) {
          if (bypassRoleId && member.roles.cache.has(bypassRoleId)) isBypass = true;
          if (member.permissions?.has && (member.permissions.has(PermissionFlagsBits.Administrator) || member.permissions.has(PermissionFlagsBits.ManageMessages))) {
            isBypass = true;
          }
        }
      } catch (e) {
        isBypass = false;
      }

      if (hasAd && !isBypass) {
        const shortContent = (msg.content && msg.content.length > 1000) ? msg.content.slice(0,1000) + '...' : (msg.content || '[Ek içerik]');

        try { await msg.delete(); } catch (e) {}

        // Kullanıcıya DM ile embed uyarı gönder
        const dmEmbed = new EmbedBuilder()
          .setTitle('Uyarı: Silinen Mesaj (Reklam/İzinsiz Link)')
          .setDescription(`Merhaba **${msg.author.username}**, gönderdiğiniz mesaj sunucu kuralları gereği silinmiştir.`)
          .addFields(
            { name: 'Kullanıcı', value: `${msg.author.tag} (${msg.author.id})`, inline: true },
            { name: 'Kanal', value: `${msg.channel.name || msg.channel.id}`, inline: true }
          )
          .addFields({ name: 'Mesaj (kısa)', value: shortContent })
          .setColor(0xED4245)
          .setTimestamp()
          .setFooter({ text: 'Lütfen kurallara uyun veya moderatörlere başvurun.' });

        try { await msg.author.send({ embeds: [dmEmbed] }); } catch (e) { /* DM kapalıysa atla */ }

        // Logger'a bildir
        try {
          if (client.logger) {
            await client.logger.warn('Reklam Engellendi', `Kullanıcı: ${msg.author.tag} - Kanal: ${msg.channel.name || msg.channel.id}`, { fields: [{ name: 'Mesaj (kısa)', value: shortContent }] });
          } else {
            await sendLogWrapper({
              title: 'Reklam Engellendi',
              description: `Bir mesaj reklam/izinsiz link nedeniyle silindi.`,
              fields: [
                { name: 'Kullanıcı', value: `${msg.author.tag} (${msg.author.id})`, inline: true },
                { name: 'Kanal', value: `${msg.channel.name || msg.channel.id}`, inline: true },
                { name: 'Mesaj (kısa)', value: shortContent }
              ],
              color: 0xED4245
            });
          }
        } catch (e) { console.warn('Reklam log hatası:', e?.message || e); }

        return;
      }
    }

    // ---------- packspacks3131 menüsü ----------
    if (msg.content.toLowerCase() === 'packspacks3131') {
      const embed = new EmbedBuilder()
        .setTitle('Eyyubi Texturepack Menüsü')
        .setDescription('Aşağıdaki menüden bir pack seçin ve bilgileri özel mesaj olarak görün!')
        .setColor(0x00AEFF)
        .setImage('https://cdn.discordapp.com/attachments/1404774897284026425/1421589268572143789/eyubi3.png?ex=68d995ad&is=68d8442d&hm=df604f07a0c4be1fb17a1a0e07cce734b6939a071dfdacc1cacc2ab75d2039a6&')
        .setFooter({ text: 'Piyasada Tek.' });
      const menu = new StringSelectMenuBuilder()
        .setCustomId('texturepack_menu')
        .setPlaceholder('Bir texturepack seçin')
        .addOptions(
          { label: 'Eyyubi Pack', value: 'eyyubi', description: 'Orijinal Eyyubi PvP Packi.' }
        );

      const row = new ActionRowBuilder().addComponents(menu);
      await msg.channel.send({ embeds: [embed], components: [row] }).catch(() => {});
    }

    // diğer messageCreate mantıkları buraya...
  } catch (err) {
    console.error('messageCreate handler hatası:', err);
    if (client.logger) client.logger.interactionError({ user: msg.author, commandName: 'messageCreate' }, err);
  }
});

// ---------- interactionCreate ----------
client.on('interactionCreate', async (interaction) => {
  try {
    // Select menu (texturepack)
    if (interaction.isStringSelectMenu() && interaction.customId === 'texturepack_menu') {
      const value = interaction.values[0];
      let packEmbed;
      if (value === 'eyyubi') {
        packEmbed = new EmbedBuilder()
          .setTitle('Eyyubi Packs')
          .setDescription('Orijinal Eyyubi PvP Pack.')
          .addFields(
    { name: '\u200B', value: '\u200B' },
		{ name: 'TexturePack Boyutu', value: 'x16' },
		{ name: '\u200B', value: '\u200B' },
		{ name: 'Sürüm', value: 'Beta 0.1', inline: true },
		{ name: 'Uygun Sürümler', value: '+1.9.2', inline: true },
	)
          .addFields(
            { name: '\u200B', value: '\u200B' },
            { name: 'İndirmek İçin', value: '[Tıklayın](https://cdn.discordapp.com/attachments/1404774897284026425/1421585201779179560/Eyyubi_Pack.zip?ex=68d991e3&is=68d84063&hm=d1e49fec51122b96445d9b3f90d5189474bb16aefe03fd9fa50b84d01f50c386&)' , inline: true })
          .setColor(0x000000)
          .setImage('https://cdn.discordapp.com/attachments/1404774897284026425/1421548626718490624/image.png?ex=68d96fd3&is=68d81e53&hm=d449dc3564a58dfafa43677d1332e72a41a517a3403ec8d452f84a157f19c77b&')
          .setThumbnail('https://cdn.discordapp.com/attachments/1404774897284026425/1421588661518205038/eyubi.png?ex=68d9951c&is=68d8439c&hm=f38f194e903dfa50adcf606682e0f7be40260e63decac1e85a1112d804555c43&')
          .setFooter({ text: 'FPS Booster' });
      } else {
        packEmbed = new EmbedBuilder().setTitle('Bilinmeyen').setDescription('Geçersiz seçenek').setColor(0xff0000);
      }
      return interaction.reply({ embeds: [packEmbed], ephemeral: true }).catch(() => {});
    }

    // Button interactions (ticket)
    if (interaction.isButton()) {
      const id = interaction.customId;
      try { client.config = JSON.parse(fs.readFileSync(configPath, 'utf8')); } catch (e) {}

      const ticketCategoryId = client.config.ticketCategoryId;
      const staffRoleId = client.config.ticketStaffRoleId;
      const prefix = client.config.ticketPrefix || 'ticket';

      if (id === 'ticket_create') {
        if (!ticketCategoryId) return interaction.reply({ content: 'Ticket kategorisi ayarlı değil.', ephemeral: true });
        const guild = interaction.guild;
        const user = interaction.user;

        const nameBase = `${prefix}-${user.username.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0,12)}`;
        const rnd = Math.floor(Math.random() * 9000) + 1000;
        const channelName = `${nameBase}-${rnd}`;

        const overwrites = [
          { id: guild.roles.everyone.id, deny: ['ViewChannel'] },
          { id: user.id, allow: ['ViewChannel','SendMessages','ReadMessageHistory'] },
          { id: client.user.id, allow: ['ViewChannel','SendMessages','ManageChannels','ReadMessageHistory'] }
        ];
        if (staffRoleId) overwrites.push({ id: staffRoleId, allow: ['ViewChannel','SendMessages','ReadMessageHistory'] });

        const channel = await guild.channels.create({
          name: channelName,
          type: ChannelType.GuildText,
          parent: ticketCategoryId,
          permissionOverwrites: overwrites,
          topic: `owner:${user.id}`
        });

        const ticketEmbed = new EmbedBuilder()
          .setTitle('🎫 Ticket Oluşturuldu')
          .setDescription(`Merhaba ${user}, destek talebiniz için bu kanalı kullanabilirsiniz.`)
          .setColor(0x57F287);

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('ticket_close').setLabel('Ticket Kapat').setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId('ticket_transcript').setLabel('Transcript').setStyle(ButtonStyle.Secondary)
        );

        await channel.send({ content: `<@${user.id}>`, embeds: [ticketEmbed], components: [row] });
        await interaction.reply({ content: `Ticket oluşturuldu: ${channel}`, ephemeral: true });
        if (client.logger) client.logger.info('Ticket Oluşturuldu', `Kanal: ${channel.name}`, { fields: [{ name: 'Kullanıcı', value: `${user.tag} (${user.id})` }] });
        return;
      }

      if (id === 'ticket_close') {
        const channel = interaction.channel;
        if (!channel || channel.type !== ChannelType.GuildText)
          return interaction.reply({ content: 'Bu buton sadece ticket kanalında çalışır.', ephemeral: true });

        await interaction.deferReply({ ephemeral: true });

        const ownerId = (channel.topic || '').match(/owner:(\d+)/)?.[1];
        const member = interaction.member;
        const isOwner = ownerId && ownerId === interaction.user.id;
        const isStaff = staffRoleId && member.roles.cache.has(staffRoleId);
        if (!isOwner && !isStaff)
          return interaction.editReply({ content: 'Bu ticketi yalnızca sahibi veya yetkili kapatabilir.' });

        await channel.edit({ name: `closed-${channel.name}` }).catch(() => {});
        if (ownerId) await channel.permissionOverwrites.edit(ownerId, { SendMessages: false }).catch(() => {});

        const closedEmbed = new EmbedBuilder()
          .setTitle('🎫 Ticket Kapatıldı')
          .setDescription(`Kapatıldı ${interaction.user.tag} tarafından.`)
          .setColor(0xED4245);

        await channel.send({ embeds: [closedEmbed] }).catch(() => {});
        await interaction.editReply({ content: 'Ticket kapatıldı. Kanal 3 saniye sonra silinecek.' });

        setTimeout(() => channel.delete().catch(() => {}), 3000);
        if (client.logger) client.logger.info('Ticket Kapatıldı', `Kapatıldı: ${channel.name}`, { fields: [{ name: 'Kullanıcı', value: `${interaction.user.tag}` }] });
        return;
      }

      if (id === 'ticket_transcript') {
        return interaction.reply({ content: 'Transcript özelliği henüz aktif değil.', ephemeral: true });
      }
    }

    // Slash komut yönlendirme
    if (interaction.isCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;
      try {
        await command.execute(interaction, client, client.logger);
        if (client.logger) client.logger.commandUsage({ interaction, commandName: interaction.commandName, success: true });
      } catch (err) {
        console.error('Komut çalıştırma hatası:', err);
        if (client.logger) client.logger.interactionError(interaction, err);
        try {
          if (!interaction.replied) await interaction.reply({ content: 'Komut çalıştırılırken hata oluştu.', ephemeral: true });
        } catch(e) {}
      }
    }

  } catch (err) {
    console.error('interactionCreate handler hatası:', err);
    if (client.logger) client.logger.interactionError({ user: interaction?.user || interaction?.member, commandName: interaction?.commandName || interaction?.customId }, err);
    try { if (interaction && !interaction.replied) await interaction.reply({ content: 'Bir hata oluştu, yöneticilere bildirildi.', ephemeral: true }); } catch(e) {}
  }
});

// ---------- Mesaj silinme / düzenleme global log -->
client.on('messageDelete', async (message) => {
  try {
    if (client.logger) await client.logger.messageDelete(message);
  } catch (e) { console.warn('messageDelete logger hatası:', e); }
});
client.on('messageUpdate', async (oldMsg, newMsg) => {
  try {
    if (client.logger) await client.logger.messageEdit(oldMsg, newMsg);
  } catch (e) { console.warn('messageUpdate logger hatası:', e); }
});

// ---------- Güvenlik: unhandled hataları logla ----------
process.on('unhandledRejection', (reason, p) => {
  console.error('Unhandled Rejection at:', p, 'reason:', reason);
  if (client.logger) client.logger.processError('UNHANDLED_REJECTION', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  if (client.logger) client.logger.processError('UNCAUGHT_EXCEPTION', err);
});

// ---------- Bot başlat ----------
if (!process.env.DISCORD_TOKEN) {
  console.error('.env içinde DISCORD_TOKEN yok.');
  process.exit(1);
}
client.login(process.env.DISCORD_TOKEN);
