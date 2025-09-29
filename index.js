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
client.config = config;

// ---------- LOGGER ENTEGRE ET ----------
let logger = null;
try {
  logger = require('./logger')(client, config);
  client.logger = logger;
  console.log('Logger entegre edildi.');
} catch (e) {
  console.warn('Logger yüklenemedi:', e?.message || e);
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
  const height = bgImage ? bgImage.height : 300; // Yüksekliği biraz artırdım

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

  // Avatar bölümü
  const avatarSize = Math.round(Math.min(height * 0.6, 160));
  const avatarX = 50;
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

  // Metin bölümü - Düzeltilmiş
  const fontFamily = 'MedievalSharp, Arial, Sans';
  const textStartX = avatarX + avatarSize + 40;
  
  // Hoşgeldin mesajı
  ctx.textAlign = 'left';
  ctx.font = 'bold 24px ' + fontFamily;
  ctx.fillStyle = '#ffffff';
  ctx.fillText('Eyyubi 1/16', textStartX, 80);
  
  // Kullanıcı adı
  ctx.font = 'bold 36px ' + fontFamily;
  ctx.fillStyle = '#ffffff';
  
  // Kullanıcı adını uygun boyutta sığdır
  const username = member.user.username;
  let usernameFontSize = 36;
  let usernameWidth;
  
  do {
    ctx.font = `bold ${usernameFontSize}px ${fontFamily}`;
    usernameWidth = ctx.measureText(username).width;
    if (usernameWidth > (width - textStartX - 50)) {
      usernameFontSize -= 2;
    } else {
      break;
    }
  } while (usernameFontSize > 20);
  
  ctx.fillText(username, textStartX, 130);

  // Alt bilgi - Tarih ve Üye sayısı
  try {
    const memberCount = member.guild.memberCount;
    const now = new Date();
    const dateStr = now.toLocaleDateString('tr-TR');
    
    ctx.font = '18px ' + fontFamily;
    ctx.fillStyle = '#cccccc';
    ctx.fillText(`Üye • #${memberCount}`, textStartX, height - 40);
    
    ctx.textAlign = 'right';
    ctx.fillText(dateStr, width - 50, height - 40);
  } catch (e) {}

  return new AttachmentBuilder(canvas.toBuffer(), { name: `welcome.png` });
}

// ---------- PACK EMBED FONKSİYONLARI ----------
function createPackEmbed1() {
  return new EmbedBuilder()
    .setTitle('Original Eyyubi Packs')
    .setDescription('Aşağıdaki menüden bir texturepack seçin ve detayları özel mesaj olarak alın!')
    .setColor(0x00AEFF)
    .setImage('https://cdn.discordapp.com/attachments/1404774897284026425/1421589268572143789/eyubi3.png?ex=68d995ad&is=68d8442d&hm=df604f07a0c4be1fb17a1a0e07cce734b6939a071dfdacc1cacc2ab75d2039a6&')
    .setFooter({ text: 'Kalite ve Performans Bir Arada' });
}

function createPackEmbed2() {
  return new EmbedBuilder()
    .setTitle('⚡ Consept Eyyubi Packs')
    .setDescription('Consept texturepacklerimizi keşfedin! Menüden seçim yapın.')
    .setColor(0xFFD700)
    .setImage('https://cdn.discordapp.com/attachments/1404774897284026425/1421589268572143789/eyubi3.png?ex=68d995ad&is=68d8442d&hm=df604f07a0c4be1fb17a1a0e07cce734b6939a071dfdacc1cacc2ab75d2039a6&')
    .setFooter({ text: 'Premium Deneyim' });
}

function createPackMenu1() {
  return new StringSelectMenuBuilder()
    .setCustomId('texturepack_menu_1')
    .setPlaceholder('Originals - Pack seçin')
    .addOptions(
      { 
        label: 'Eyyubi Pack', 
        value: 'eyyubi_pack', 
        description: 'Orijinal Eyyubi PvP Packi',
        emoji: '🛡️'
      }
    );
}

function createPackMenu2() {
  return new StringSelectMenuBuilder()
    .setCustomId('texturepack_menu_2')
    .setPlaceholder('Consept - Pack seçin')
    .addOptions(
      { 
        label: 'Godfather Pack', 
        value: 'godfather_pack', 
        description: 'Godfather Temalı PvP pack',
        emoji: '🎩'
      }
    );
}

// ---------- PACK DETAY EMBED FONKSİYONLARI ----------
function getPackDetails1(packValue) {
  const packs = {
    'eyyubi_pack': {
      title: 'Eyyubi Pack',
      description: 'Orijinal Eyyubi PvP Pack - En iyi PvP deneyimi için optimize edilmiş',
      color: 0x000000,
      fields: [
        { name: 'TexturePack Boyutu', value: 'x16', inline: true },
        { name: 'Sürüm', value: 'Beta 0.1', inline: true },
        { name: 'Uygun Sürümler', value: '+1.9.2', inline: true },
        { name: 'Özellikler', value: 'FPS Boost, Clear Texture, PvP Optimized' },
        { name: 'İndirme Linki', value: '[Tıklayın](https://www.mediafire.com/file/r6605hu807ckan7/Eyyubi_Pack.zip/file)' }
      ],
      image: 'https://cdn.discordapp.com/attachments/1404774897284026425/1421548626718490624/image.png',
      thumbnail: 'https://cdn.discordapp.com/attachments/1404774897284026425/1421588661518205038/eyubi.png'
    }
  };
  return packs[packValue] || null;
}

function getPackDetails2(packValue) {
  const packs = {
    'godfather_pack': {
      title: 'Godfather Pack',
      description: 'Godfather temalı FPS boost texturepack',
      color: 0x000000,
      fields: [
        { name: 'TexturePack Boyutu', value: 'x32-x16', inline: true },
        { name: 'Sürüm', value: 'Beta 1.0', inline: true },
        { name: 'Uygun Sürümler', value: '+1.9+', inline: true },
        { name: 'Özellikler', value: 'Fps Boost, DuraPack, Custom Crosshair' },
        { name: 'İndirme Linki', value: '[Tıklayın](https://www.mediafire.com/file/2dmk6hk8wq847hc/GodFather0.1.zip/file)' }
      ],
      thumbnail: 'https://cdn.discordapp.com/attachments/1404774897284026425/1421950750283534426/image.png'
    }
  };
  return packs[packValue] || null;
}

// ---------- GUILD MEMBER EVENTS ----------
client.on('guildMemberAdd', async (member) => {
  try {
    if (ALLOWED_GUILD_ID && member.guild.id !== ALLOWED_GUILD_ID) return;

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
    await channel.send({ 
      content: `🎉 Aramıza hoşgeldin <@${member.id}>!`, 
      files: [attachment] 
    }).catch(() => {});
    
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
    await channel.send({ 
      content: `😢 Görüşürüz <@${member.id}>!`, 
      files: [attachment] 
    }).catch(() => {});
    
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

// ---------- messageCreate (reklam engelleme ve pack menüleri) ----------
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

        try { await msg.author.send({ embeds: [dmEmbed] }); } catch (e) { }
        if (client.logger) await client.logger.warn('Reklam Engellendi', `Kullanıcı: ${msg.author.tag} - Kanal: ${msg.channel.name || msg.channel.id}`, { fields: [{ name: 'Mesaj (kısa)', value: shortContent }] });
        return;
      }
    }

    // ---------- PACK MENÜ TETİKLEYİCİLERİ ----------
    const content = msg.content.toLowerCase();

    // Koleksiyon 1 Tetikleyicileri
    const triggers1 = ['packspacks3131', '!pack', '!texture', '!packs', 'packmenu', 'texturemenu'];
    if (triggers1.includes(content)) {
      const embed = createPackEmbed1();
      const menu = createPackMenu1();
      const row = new ActionRowBuilder().addComponents(menu);
      await msg.channel.send({ embeds: [embed], components: [row] }).catch(() => {});
    }

    // Koleksiyon 2 Tetikleyicileri
    const triggers2 = ['packal', '!premium', '!pack2', '!elitepack', 'premiummenu', 'elitemenu'];
    if (triggers2.includes(content)) {
      const embed = createPackEmbed2();
      const menu = createPackMenu2();
      const row = new ActionRowBuilder().addComponents(menu);
      await msg.channel.send({ embeds: [embed], components: [row] }).catch(() => {});
    }

  } catch (err) {
    console.error('messageCreate handler hatası:', err);
    if (client.logger) client.logger.interactionError({ user: msg.author, commandName: 'messageCreate' }, err);
  }
});

// ---------- interactionCreate ----------
client.on('interactionCreate', async (interaction) => {
  try {
    // Select menu interactions
    if (interaction.isStringSelectMenu()) {
      
      // Koleksiyon 1 Menüsü
      if (interaction.customId === 'texturepack_menu_1') {
        const value = interaction.values[0];
        const packDetails = getPackDetails1(value);
        
        if (packDetails) {
          const packEmbed = new EmbedBuilder()
            .setTitle(packDetails.title)
            .setDescription(packDetails.description)
            .setColor(packDetails.color)
            .addFields(packDetails.fields);

          if (packDetails.image) packEmbed.setImage(packDetails.image);
          if (packDetails.thumbnail) packEmbed.setThumbnail(packDetails.thumbnail);
          
          packEmbed.setFooter({ text: 'Eyyubi FPS Booster • Kaliteli Oyun Deneyimi' });
          
          return interaction.reply({ embeds: [packEmbed], ephemeral: true }).catch(() => {});
        } else {
          const errorEmbed = new EmbedBuilder()
            .setTitle('Hata')
            .setDescription('Seçilen pack bulunamadı.')
            .setColor(0xff0000);
          return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
      }

      // Koleksiyon 2 Menüsü
      if (interaction.customId === 'texturepack_menu_2') {
        const value = interaction.values[0];
        const packDetails = getPackDetails2(value);
        
        if (packDetails) {
          const packEmbed = new EmbedBuilder()
            .setTitle(packDetails.title)
            .setDescription(packDetails.description)
            .setColor(packDetails.color)
            .addFields(packDetails.fields)
            .setFooter({ text: 'Eyyubi Consept Packs' });

          if (packDetails.image) packEmbed.setImage(packDetails.image);
          if (packDetails.thumbnail) packEmbed.setThumbnail(packDetails.thumbnail);
          
          return interaction.reply({ embeds: [packEmbed], ephemeral: true }).catch(() => {});
        } else {
          const errorEmbed = new EmbedBuilder()
            .setTitle('Hata')
            .setDescription('Seçilen pack bulunamadı.')
            .setColor(0xff0000);
          return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
      }
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
client.login(process.env.token);
