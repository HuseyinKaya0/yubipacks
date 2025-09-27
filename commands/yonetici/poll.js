const { 
  SlashCommandBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  EmbedBuilder 
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('oylama')
    .setDescription('Bir oylama başlat.')
    .addStringOption(option =>
      option.setName('cins')
        .setDescription('Oylamanın süresinin cinsi.')
        .setRequired(true)
        .addChoices(
          { name: 'Gün', value: 'gun' },
          { name: 'Saat', value: 'saat' },
          { name: 'Dakika', value: 'dakika' },
          { name: 'Saniye', value: 'saniye' }
        )
    )
    .addIntegerOption(option =>
      option.setName('süre')
        .setDescription('Oylamanın süresi (seçtiğiniz cins cinsinden).')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('seçenekler')
        .setDescription('Seçenekleri virgülle ayırarak girin. (Örn: Seçenek1,Seçenek2)')
        .setRequired(true)
    ),

  async execute(interaction) {
    if (!interaction.member.permissions.has('Administrator')) {
      return interaction.reply({ 
        content: '❌ Bu komutu kullanmak için `Administrator` yetkisine sahip olmalısınız.', 
        flags: 64 // ephemeral yerine
      });
    }

    const unit = interaction.options.getString('cins');
    const timeValue = interaction.options.getInteger('süre');
    const options = interaction.options.getString('seçenekler').split(',').map(opt => opt.trim());

    if (options.length < 2) {
      return interaction.reply({ 
        content: '❌ En az 2 seçenek girmelisiniz.', 
        flags: 64 
      });
    }

    // süreyi hesapla
    let duration;
    switch (unit) {
      case 'gun': duration = timeValue * 24 * 60 * 60 * 1000; break;
      case 'saat': duration = timeValue * 60 * 60 * 1000; break;
      case 'dakika': duration = timeValue * 60 * 1000; break;
      case 'saniye': duration = timeValue * 1000; break;
    }

    const embed = new EmbedBuilder()
      .setTitle('🗳️ Oylama Başladı!')
      .setDescription('Aşağıdaki butonlara tıklayarak oy kullanabilirsiniz.')
      .setColor(0x5865F2)
      .setFooter({ text: `Oylama ${timeValue} ${unit} sürecek.` })
      .setTimestamp();

    const buttons = new ActionRowBuilder();
    const votes = {};
    const votedUsers = new Set();

    options.forEach((option, index) => {
      buttons.addComponents(
        new ButtonBuilder()
          .setCustomId(`option_${index}`)
          .setLabel(option)
          .setStyle(ButtonStyle.Primary)
      );
      votes[`option_${index}`] = 0;
    });

    const pollMessage = await interaction.reply({ 
      embeds: [embed], 
      components: [buttons], 
      withResponse: true // fetchReply yerine
    }).then(res => res.resource.message);

    const collector = pollMessage.createMessageComponentCollector({ time: duration });

    collector.on('collect', async i => {
      if (!i.isButton()) return;

      // aynı kişi tekrar oy kullanamasın
      if (votedUsers.has(i.user.id)) {
        await i.deferUpdate();
        return i.followUp({ 
          content: '❌ Zaten oy kullandınız.', 
          flags: 64 
        });
      }

      votedUsers.add(i.user.id);
      votes[i.customId] += 1;

      await i.deferUpdate();
      await i.followUp({ 
        content: `✅ **${i.user.username}**, "${options[parseInt(i.customId.split('_')[1])]}" seçeneğine oy verdiniz!`, 
        flags: 64 
      });
    });

    collector.on('end', async () => {
      const results = Object.keys(votes)
        .map((key, index) => `${options[index]}: **${votes[key]} oy**`)
        .join('\n');

      const resultEmbed = new EmbedBuilder()
        .setTitle('🗳️ Oylama Sona Erdi!')
        .setDescription(results)
        .setColor(0x57F287)
        .setTimestamp();

      await pollMessage.edit({ embeds: [resultEmbed], components: [] });
    });
  },
};
