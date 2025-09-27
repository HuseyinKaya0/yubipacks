const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');
const configPath = path.join(__dirname, '..', '..', 'config.json');
function loadConfig() { try { return JSON.parse(fs.readFileSync(configPath, 'utf8')); } catch { return {}; } }

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-panel')
    .setDescription('Ticket paneli oluşturur (butonlu).')
    .addChannelOption(opt => opt.setName('kanal').setDescription('Panelin atılacağı kanal').setRequired(false)),
  async execute(interaction) {
    const config = loadConfig();
    const channel = interaction.options.getChannel('kanal') || interaction.guild.channels.cache.get(config.ticketPanelChannelId) || interaction.channel;
    if (!channel || !channel.send) return interaction.reply({ content: 'Geçerli bir kanal seçin veya config.ticketPanelChannelId ayarlayın.', ephemeral: true });

    const embed = new EmbedBuilder()
      .setTitle('Ticket Desteği')
      .setDescription('Aşağıdaki "Ticket Aç" butonuna tıklayarak destek bileti oluşturabilirsiniz.')
      .setColor(0x5865F2)
      .setFooter({ text: 'Yetkililer en kısa sürede dönüş yapacaktır.' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('ticket_create').setLabel('Ticket Aç').setStyle(ButtonStyle.Success)
    );

    await channel.send({ embeds: [embed], components: [row] }).catch(err => console.error('Panel gönderme hatası:', err));
    return interaction.reply({ content: `Panel ${channel} kanalına gönderildi.`, ephemeral: true });
  }
};