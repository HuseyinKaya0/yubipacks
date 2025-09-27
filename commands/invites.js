// commands/invites.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('invites')
    .setDescription('Belirtilen kullanıcının davet sayılarını gösterir')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('Davetlerini görmek istediğin kullanıcı')
        .setRequired(false)
    ),

  async execute(interaction) {
    // Eğer parametre verilmediyse komutu kullanan kişi alınır
    const target = interaction.options.getUser('user') || interaction.user;

    try {
      // Guild içinde davetleri çek
      const invites = await interaction.guild.invites.fetch();
      // Bu kişinin davetlerini filtrele
      const userInvites = invites.filter(inv => inv.inviter && inv.inviter.id === target.id);

      let total = 0;
      let uses = 0;

      userInvites.forEach(inv => {
        uses += inv.uses ?? 0;
        total++;
      });

      const embed = new EmbedBuilder()
        .setTitle(`📨 ${target.username} - Davet Bilgileri`)
        .setThumbnail(target.displayAvatarURL({ dynamic: true }))
        .setColor(0x00AE86)
        .addFields(
          { name: 'Toplam Davet Linki', value: `${total}`, inline: true },
          { name: 'Kullanılan Davetler', value: `${uses}`, inline: true }
        )
        .setFooter({ text: `İsteyen: ${interaction.user.tag}` })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

    } catch (err) {
      console.error('Invite komutu hatası:', err);
      await interaction.reply({ content: '❌ Davet bilgileri alınırken bir hata oluştu.', ephemeral: true });
    }
  }
};
