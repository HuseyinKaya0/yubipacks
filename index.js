// index.js — Güncellenmiş versiyon (canvas kaldırıldı, embed'li hoş geldin eklendi)
const fs = require('fs');
const path = require('path');
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

// ---------- ROL SİSTEMİ FONKSİYONLARI ----------
function createRoleButtons() {
    return [
        new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('role_net')
                    .setLabel('NethPot')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🛡️'),
                new ButtonBuilder()
                    .setCustomId('role_dura')
                    .setLabel('DuraPack Rolü')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🛡️')
            ),
        new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('role_uhc')
                    .setLabel('UHCPack Rolü')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🏹'),
                new ButtonBuilder()
                    .setCustomId('role_diapot')
                    .setLabel('Diapot Rolü')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('💎'),
                new ButtonBuilder()
                    .setCustomId('role_smp')
                    .setLabel('SMP Pack Rolü')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🌳'),
                new ButtonBuilder()
                    .setCustomId('role_helpful')
                    .setLabel('Helpful Pack Rolü')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🌟')
            ),
        new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('role_temizle')
                    .setLabel('Tüm Rolleri Temizle')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🧹')
            )
    ];
}

function createRoleEmbed() {
    return new EmbedBuilder()
        .setTitle('🎯 Pack Bildirim Rolleri')
        .setDescription('Aşağıdaki butonlara tıklayarak istediğiniz pack kategorilerinin bildirim rollerini alabilirsiniz!\n\n**Mevcut Pack Kategorileri:**\n🛡️ Eyyubi Pack - Orijinal packlerimiz\n⭐ Premium Pack - Özel packler\n🎮 Oyuncu Pack - Topluluk packleri\n🛡️ DuraPack - Dayanıklılık packleri\n🏹 UHC Pack - UHC modu packleri\n💎 Diapot Pack - Elmas temalı packler\n🌳 SMP Pack - SMP modu packleri\n🌟 Helpful Pack - Yardımcı packler')
        .setColor(0x00AE86)
        .setImage('https://cdn.discordapp.com/attachments/1404774897284026425/1421589268572143789/eyubi3.png?ex=68d995ad&is=68d8442d&hm=df604f07a0c4be1fb17a1a0e07cce734b6939a071dfdacc1cacc2ab75d2039a6&')
        .addFields(
            { name: '📢 Nasıl Çalışır?', value: 'Butona tıklayarak rolü alırsınız, tekrar tıklayarak çıkarırsınız. Her yeni pack paylaşımında ilgili rol etiketlenecektir.' },
            { name: '🧹 Temizleme', value: 'Tüm pack rollerinizi temizlemek için "Tüm Rolleri Temizle" butonunu kullanın.' }
        )
        .setFooter({ text: 'İstediğiniz pack kategorilerinin bildirimlerini almak için butonlara tıklayın!' });
}

// ---------- HOŞ GELDİN/GÖRÜŞÜRÜZ EMBED FONKSİYONLARI ----------
function createWelcomeEmbed(member, isWelcome = true) {
    const user = member.user;
    const guild = member.guild;
    
    const embed = new EmbedBuilder()
        .setColor(isWelcome ? 0x00FF00 : 0xFF0000)
        .setTitle(isWelcome ? '🎉 Sunucuya Hoş Geldin!' : '😢 Sunucudan Ayrıldı')
        .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }))
        .setDescription(isWelcome 
            ? `Merhaba ${user}, **${guild.name}** sunucusuna hoş geldin!`
            : `**${user.tag}** sunucumuzdan ayrıldı.`
        )
        .addFields(
            {
                name: '👤 Kullanıcı Bilgileri',
                value: `• Kullanıcı: ${user.tag} (${user.id})\n• Hesap Oluşturulma: <t:${Math.floor(user.createdTimestamp / 1000)}:R>`,
                inline: true
            },
            {
                name: isWelcome ? '📥 Katılma Bilgisi' : '📤 Ayrılma Bilgisi',
                value: isWelcome 
                    ? `• Sunucuya Katılma: <t:${Math.floor(member.joinedTimestamp / 1000)}:R>\n• Üye Sayısı: ${guild.memberCount}`
                    : `• Sunucudan Ayrılma: <t:${Math.floor(Date.now() / 1000)}:R>\n• Üye Sayısı: ${guild.memberCount}`,
                inline: true
            }
        )
        .setImage(isWelcome 
            ? 'https://cdn.discordapp.com/attachments/1404774897284026425/1421589268572143789/eyubi3.png?ex=68e378ed&is=68e2276d&hm=b4bc046e712c32a282e8c0c968e11c6cc5d0c54a9f62e8559fd2a8622d467b35&'
            : 'https://cdn.discordapp.com/attachments/1404774897284026425/1421589268572143789/eyubi3.png?ex=68e378ed&is=68e2276d&hm=b4bc046e712c32a282e8c0c968e11c6cc5d0c54a9f62e8559fd2a8622d467b35&'
        )
        .setFooter({ 
            text: isWelcome 
                ? `${guild.name} - Keyifli vakit geçirmen dileğiyle!`
                : `${guild.name} - Tekrar bekleriz!`,
            iconURL: guild.iconURL({ dynamic: true })
        })
        .setTimestamp();

    return embed;
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

    const embed = createWelcomeEmbed(member, true);
    await channel.send({ 
      content: `🎉 Aramıza hoşgeldin <@${member.id}>!`, 
      embeds: [embed] 
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

    const embed = createWelcomeEmbed(member, false);
    await channel.send({ 
      content: `😢 Görüşürüz <@${member.id}>!`, 
      embeds: [embed] 
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

// ---------- messageCreate (reklam engelleme, pack menüleri ve rol komutu) ----------
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

    const content = msg.content.toLowerCase();

    // ---------- ROL KOMUTU ----------
    if (content === '!roller') {
      // Yetki kontrolü - istersen kaldırabilirsin
      if (!msg.member.permissions.has('Administrator')) {
        return msg.reply({ 
          content: '❌ Bu komutu sadece yöneticiler kullanabilir!', 
          ephemeral: true 
        }).catch(() => {});
      }

      const embed = createRoleEmbed();
      const rows = createRoleButtons();
      
      await msg.channel.send({ 
        embeds: [embed], 
        components: rows 
      });
      await msg.delete().catch(() => {});
      return;
    }

    // ---------- PACK MENÜ TETİKLEYİCİLERİ ----------
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
    // ---------- BUTON INTERACTIONLARI ----------
    if (interaction.isButton()) {
      const { customId, member, guild } = interaction;

      // ---------- ROL BUTONLARI ----------
      if (customId.startsWith('role_')) {
        // ROL ID'LERİNİ BURAYA GİR - KENDİ SUNUCUNDAKİ ROL ID'LERİ İLE DEĞİŞTİR!
        const roleIds = {
          'role_net': '1424389981614637136',      // Eyyubi rol ID'si
          'role_dura': '1424390222233210963',          // DuraPack rol ID'si
          'role_uhc': '1424390579751485500',            // UHCPack rol ID'si
          'role_diapot': '1424390055228870668',      // Diapot rol ID'si
          'role_smp': '1424390177232781535',            // SMP Pack rol ID'si
          'role_helpful': '1424390269767254197'     // Helpful Pack rol ID'si
        };

        await interaction.deferReply({ ephemeral: true });

        // Rolleri temizle butonu
        if (customId === 'role_temizle') {
          let removedCount = 0;
          
          for (const roleKey in roleIds) {
            const roleId = roleIds[roleKey];
            const role = await guild.roles.fetch(roleId).catch(() => null);
            
            if (role && member.roles.cache.has(role.id)) {
              await member.roles.remove(role).catch(() => {});
              removedCount++;
            }
          }
          
          if (removedCount > 0) {
            await interaction.editReply({ 
              content: `✅ ${removedCount} adet pack rolü başarıyla kaldırıldı!` 
            });
          } else {
            await interaction.editReply({ 
              content: '❌ Zaten hiç pack rolünüz yok!' 
            });
          }
          return;
        }

        // Rol ekleme/çıkarma butonları
        const roleId = roleIds[customId];
        if (!roleId || roleId.includes('BURAYA')) {
          return interaction.editReply({ 
            content: '❌ Rol IDleri ayarlanmamış! Lütfen bot sahibine bildirin.' 
          });
        }

        const role = await guild.roles.fetch(roleId).catch(() => null);
        if (!role) {
          return interaction.editReply({ 
            content: '❌ Rol bulunamadı! Lütfen yöneticilere bildirin.' 
          });
        }

        // Rolü kontrol et ve işlem yap
        if (member.roles.cache.has(role.id)) {
          // Rolü çıkar
          await member.roles.remove(role);
          await interaction.editReply({ 
            content: `✅ **${role.name}** rolü başarıyla kaldırıldı! Artık bu pack kategorisinden bildirim almayacaksınız.` 
          });
          
          if (client.logger) {
            client.logger.moderation({ 
              action: 'ROL_KALDIRMA', 
              moderator: client.user.tag, 
              target: member.user.tag, 
              reason: 'Buton ile rol kaldırma',
              details: `Rol: ${role.name}`
            });
          }
        } else {
          // Rolü ekle
          await member.roles.add(role);
          await interaction.editReply({ 
            content: `✅ **${role.name}** rolü başarıyla verildi! Artık bu pack kategorisinden bildirim alacaksınız. 🎉` 
          });
          
          if (client.logger) {
            client.logger.moderation({ 
              action: 'ROL_VERME', 
              moderator: client.user.tag, 
              target: member.user.tag, 
              reason: 'Buton ile rol verme',
              details: `Rol: ${role.name}`
            });
          }
        }
        return;
      }

      // ---------- TICKET BUTONLARI ----------
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

    // ---------- SELECT MENU INTERACTIONLARI ----------
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

    // ---------- SLASH KOMUT YÖNLENDİRME ----------
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

