const fs = require('fs');
const path = require('path');
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const configPath = path.join(__dirname, '..', '..', 'config.json');
function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch {
    return {};
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('terfi')
    .setDescription('Kullanıcıyı bir üst seviyeye terfi ettirir (4 kademeli).')
    .addUserOption(opt => opt.setName('hedef').setDescription('Terfi edilecek kullanıcı').setRequired(true))
    .addStringOption(opt => opt.setName('sebep').setDescription('Terfi sebebi').setRequired(false))
    .setDefaultMemberPermissions(null), // herkes görebilsin; kullanımı config içindeki kurucu rolü ile kısıtlıyoruz
  async execute(interaction) {
    const config = loadConfig();
    const promotions = Array.isArray(config.promotions) ? config.promotions : [];
    const normalRoleId = config.normalRoleId;
    const logChannelId = config.logChannelId;
    const founderRoleId = config.founderRoleId; // kurucu rolü ID'si (zorunlu)

    if (!founderRoleId) {
      const e = new EmbedBuilder()
        .setTitle('Konfigürasyon Eksik')
        .setDescription('config.json içinde "founderRoleId" (kurucu rolü) ayarlı değil.')
        .setColor(0xED4245)
        .setTimestamp();
      return interaction.reply({ embeds: [e], ephemeral: true });
    }

    // Kurucu rolüne sahip olma kontrolü
    if (!interaction.member.roles.cache.has(founderRoleId)) {
      const e = new EmbedBuilder()
        .setTitle('Yetki Hatası')
        .setDescription('Bu komutu kullanmak için kurucu rolüne sahip olmalısın.')
        .setColor(0xED4245)
        .setTimestamp();
      return interaction.reply({ embeds: [e], ephemeral: true });
    }

    // Mevcut diğer kontroller ve işlem
    if (!normalRoleId || promotions.length === 0 || !logChannelId) {
      const e = new EmbedBuilder()
        .setTitle('Konfigürasyon Eksik')
        .setDescription('Sunucu config eksik. normalRoleId, promotions ve logChannelId ayarlarını kontrol et.')
        .setColor(0xED4245)
        .setTimestamp();
      return interaction.reply({ embeds: [e], ephemeral: true });
    }

    const targetUser = interaction.options.getUser('hedef', true);
    const reason = interaction.options.getString('sebep') || 'Belirtilmedi';

    try {
      const guild = interaction.guild;
      const targetMember = await guild.members.fetch(targetUser.id);

      if (targetMember.user.bot) {
        const e = new EmbedBuilder()
          .setTitle('Geçersiz Hedef')
          .setDescription('Botları terfi ettiremezsin.')
          .setColor(0xED4245)
          .setTimestamp();
        return interaction.reply({ embeds: [e], ephemeral: true });
      }

      const botMember = guild.members.me;
      if (!botMember.permissions.has('ManageRoles')) {
        const e = new EmbedBuilder()
          .setTitle('Bot Yetkisi Eksik')
          .setDescription('Botun Manage Roles izni yok. Botun rolünü ve izinlerini kontrol et.')
          .setColor(0xED4245)
          .setTimestamp();
        return interaction.reply({ embeds: [e], ephemeral: true });
      }

      // Kullanıcının mevcut terfi indeksini bul
      let currentIndex = -1;
      for (let i = promotions.length - 1; i >= 0; i--) {
        if (targetMember.roles.cache.has(promotions[i])) {
          currentIndex = i;
          break;
        }
      }

      let nextIndex = currentIndex + 1;
      if (currentIndex === -1) nextIndex = 0;

      if (nextIndex >= promotions.length) {
        const e = new EmbedBuilder()
          .setTitle('Zaten En Üst Seviye')
          .setDescription('Kullanıcı zaten en üst seviyede.')
          .setColor(0xFEE75C)
          .setTimestamp();
        return interaction.reply({ embeds: [e], ephemeral: true });
      }

      const nextRoleId = promotions[nextIndex];
      const nextRole = guild.roles.cache.get(nextRoleId);
      if (!nextRole) {
        const e = new EmbedBuilder()
          .setTitle('Rol Bulunamadı')
          .setDescription(`Terfi rolü bulunamadı: ${nextRoleId}`)
          .setColor(0xED4245)
          .setTimestamp();
        return interaction.reply({ embeds: [e], ephemeral: true });
      }

      if (nextRole.position >= botMember.roles.highest.position) {
        const e = new EmbedBuilder()
          .setTitle('Rol Pozisyonu Hatası')
          .setDescription('Botun rolü, eklemeye çalıştığı rolden daha yüksek olmalı. Bot rolünü yükseltin.')
          .setColor(0xED4245)
          .setTimestamp();
        return interaction.reply({ embeds: [e], ephemeral: true });
      }

      if (currentIndex >= 0) {
        const currentRoleId = promotions[currentIndex];
        const currentRole = guild.roles.cache.get(currentRoleId);
        if (currentRole) {
          if (currentRole.position >= botMember.roles.highest.position) {
            const e = new EmbedBuilder()
              .setTitle('Mevcut Rol Kaldırılamıyor')
              .setDescription('Mevcut rolü kaldıramıyorum çünkü rol botun rolünden yüksek.')
              .setColor(0xED4245)
              .setTimestamp();
            return interaction.reply({ embeds: [e], ephemeral: true });
          }
          await targetMember.roles.remove(currentRoleId, `Terfi: ${interaction.user.tag} - ${reason}`);
        }
      }

      await targetMember.roles.add(nextRoleId, `Terfi: ${interaction.user.tag} - ${reason}`);

      const successEmbed = new EmbedBuilder()
        .setTitle('Terfi Başarılı')
        .setColor(0x57F287)
        .setTimestamp()
        .addFields(
          { name: 'Kullanıcı', value: `${targetMember.user.tag} (<@${targetMember.id}>)`, inline: true },
          { name: 'Yeni Rol', value: `${nextRole.name}`, inline: true },
          { name: 'Seviye', value: `${nextIndex + 1} / ${promotions.length}`, inline: true },
          { name: 'Yetkili', value: `${interaction.user.tag}`, inline: true },
          { name: 'Sebep', value: reason, inline: false }
        );

      const logChannel = guild.channels.cache.get(logChannelId);
      if (logChannel) {
        const logEmbed = new EmbedBuilder()
          .setTitle('Terfi Logu')
          .setColor(0x5865F2)
          .setTimestamp()
          .addFields(
            { name: 'Kullanıcı', value: `${targetMember.user.tag} (<@${targetMember.id}>)`, inline: true },
            { name: 'Yeni Rol', value: `${nextRole.name}`, inline: true },
            { name: 'Seviye', value: `${nextIndex + 1} / ${promotions.length}`, inline: true },
            { name: 'Yetkili', value: `${interaction.user.tag} (<@${interaction.user.id}>)`, inline: true },
            { name: 'Sebep', value: reason, inline: false },
            { name: 'Sunucu', value: `${guild.name} (${guild.id})`, inline: false }
          );
        await logChannel.send({ embeds: [logEmbed] }).catch(() => {});
      }

      return interaction.reply({ embeds: [successEmbed], ephemeral: false });
    } catch (err) {
      console.error('Terfi komutu hatası:', err);
      const e = new EmbedBuilder()
        .setTitle('Hata')
        .setDescription('İşlem sırasında hata oluştu. Konsolu kontrol et.')
        .setColor(0xED4245)
        .setTimestamp();
      return interaction.reply({ embeds: [e], ephemeral: true });
    }
  }
};