// commands/paylas.js
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('paylas')
        .setDescription('Texture pack paylaşımı yapın')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option =>
            option.setName('pack_türü')
                .setDescription('Pack türünü seçin')
                .setRequired(true)
                .addChoices(
                    { name: '⚡ Eltyro Pack', value: 'eltyro' },
                    { name: '💎 Diapot Pack', value: 'diapot' },
                    { name: '🔥 Nethpot Pack', value: 'nethpot' },
                    { name: '🏹 UHC Pack', value: 'uhc' },
                    { name: '🌳 SMP Pack', value: 'smp' },
                    { name: '🛡️ Dura Pack', value: 'dura' },
                    { name: '🌟 Helpful Pack', value: 'helpful' },
                    { name: '🏰 Medieval Pack', value: 'medieval' },
                    { name: '🌑 Shadow Pack', value: 'shadow' }
                )
        )
        .addStringOption(option =>
            option.setName('pack_adi')
                .setDescription('Pack adını girin')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('indirme_linki')
                .setDescription('Pack indirme linki')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('aciklama')
                .setDescription('Pack açıklaması')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('boyut')
                .setDescription('Texture pack boyutu')
                .setRequired(true)
                .addChoices(
                    { name: 'x16', value: 'x16' },
                    { name: 'x32', value: 'x32' },
                    { name: 'x64', value: 'x64' },
                    { name: 'x128', value: 'x128' },
                    { name: 'x16-x32', value: 'x16-x32' }
                )
        )
        .addStringOption(option =>
            option.setName('surum')
                .setDescription('Pack sürümü')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('uyumlu_surumler')
                .setDescription('Uyumlu Minecraft sürümleri')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('ozellikler')
                .setDescription('Pack özellikleri')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('resim_url')
                .setDescription('Pack görsel URLsi')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('kucuk_resim_url')
                .setDescription('Pack küçük resim URLsi (boş bırakılırsa sunucu resmi kullanılır)')
                .setRequired(false)
        ),

    async execute(interaction, client, logger) {
        try {
            await interaction.deferReply({ ephemeral: true });

            // Seçenekleri al
            const packTuru = interaction.options.getString('pack_türü');
            const packAdi = interaction.options.getString('pack_adi');
            const indirmeLinki = interaction.options.getString('indirme_linki');
            const aciklama = interaction.options.getString('aciklama');
            const boyut = interaction.options.getString('boyut');
            const surum = interaction.options.getString('surum');
            const uyumluSurumler = interaction.options.getString('uyumlu_surumler');
            const ozellikler = interaction.options.getString('ozellikler');
            const resimUrl = interaction.options.getString('resim_url');
            const kucukResimUrl = interaction.options.getString('kucuk_resim_url');

            // Pack türüne göre config'den kanal ve rol bilgilerini al
            const packConfigs = {
                'eltyro': {
                    channelId: client.config.eltyroChannelId,
                    roleId: client.config.eltyroRoleId,
                    title: '⚡ Eltyro Pack',
                    color: 0xFFD700,
                    thumbnail: interaction.guild.iconURL({ size: 128 }) || null
                },
                'diapot': {
                    channelId: client.config.diapotChannelId,
                    roleId: client.config.diapotRoleId,
                    title: '💎 Diapot Pack',
                    color: 0x00FFFF,
                    thumbnail: interaction.guild.iconURL({ size: 128 }) || null
                },
                'nethpot': {
                    channelId: client.config.nethpotChannelId,
                    roleId: client.config.nethpotRoleId,
                    title: '🔥 Nethpot Pack',
                    color: 0xFF4500,
                    thumbnail: interaction.guild.iconURL({ size: 128 }) || null
                },
                'uhc': {
                    channelId: client.config.uhcChannelId,
                    roleId: client.config.uhcRoleId,
                    title: '🏹 UHC Pack',
                    color: 0x228B22,
                    thumbnail: interaction.guild.iconURL({ size: 128 }) || null
                },
                'smp': {
                    channelId: client.config.smpChannelId,
                    roleId: client.config.smpRoleId,
                    title: '🌳 SMP Pack',
                    color: 0x32CD32,
                    thumbnail: interaction.guild.iconURL({ size: 128 }) || null
                },
                'dura': {
                    channelId: client.config.duraChannelId,
                    roleId: client.config.duraRoleId,
                    title: '🛡️ Dura Pack',
                    color: 0x8B4513,
                    thumbnail: interaction.guild.iconURL({ size: 128 }) || null
                },
                'helpful': {
                    channelId: client.config.helpfulChannelId,
                    roleId: client.config.helpfulRoleId,
                    title: '🌟 Helpful Pack',
                    color: 0xFF69B4,
                    thumbnail: interaction.guild.iconURL({ size: 128 }) || null
                },
                'medieval': {
                    channelId: client.config.medievalChannelId,
                    roleId: client.config.medievalRoleId,
                    title: '🏰 Medieval Pack',
                    color: 0x8B4513,
                    thumbnail: interaction.guild.iconURL({ size: 128 }) || null
                },
                'shadow': {
                    channelId: client.config.shadowChannelId,
                    roleId: client.config.shadowRoleId,
                    title: '🌑 Shadow Pack',
                    color: 0x2F4F4F,
                    thumbnail: interaction.guild.iconURL({ size: 128 }) || null
                }
            };

            const packConfig = packConfigs[packTuru];

            if (!packConfig || !packConfig.channelId) {
                return await interaction.editReply({ 
                    content: `❌ "${packTuru}" türü için kanal ayarlanmamış. Lütfen config.json dosyasını kontrol edin.` 
                });
            }

            // Kanalı bul
            const targetChannel = interaction.guild.channels.cache.get(packConfig.channelId) || 
                               await interaction.guild.channels.fetch(packConfig.channelId).catch(() => null);
            
            if (!targetChannel) {
                return await interaction.editReply({ 
                    content: `❌ "${packConfig.title}" kanalı bulunamadı! Lütfen kanal ID'sini kontrol edin.` 
                });
            }

            // Rolü bul (bildirim için)
            let roleMention = '';
            if (packConfig.roleId) {
                const role = interaction.guild.roles.cache.get(packConfig.roleId);
                if (role) {
                    roleMention = `${role}`;
                }
            }

            // Küçük resim URL'sini belirle
            let finalThumbnailUrl = kucukResimUrl;
            if (!finalThumbnailUrl) {
                // Kullanıcı küçük resim URL'si belirtmemişse sunucu resmini kullan
                finalThumbnailUrl = interaction.guild.iconURL({ size: 128, extension: 'png' });
            }

            // Embed oluştur
            const shareEmbed = new EmbedBuilder()
                .setTitle(`${packConfig.title} - ${packAdi}`)
                .setDescription(aciklama)
                .setColor(packConfig.color)
                .addFields(
                    { name: '📦 TexturePack Boyutu', value: boyut, inline: true },
                    { name: '🔖 Sürüm', value: surum, inline: true },
                    { name: '🎮 Uyumlu Sürümler', value: uyumluSurumler, inline: true },
                    { name: '⚡ Özellikler', value: ozellikler },
                    { name: '📥 İndirme Linki', value: `[Tıklayın](${indirmeLinki})` }
                )
                .setTimestamp()
                .setFooter({ 
                    text: `Paylaşan Yetkili: ${interaction.user.displayName} • Eyyubi TexturePacks`,
                    icon_url: interaction.user.displayAvatarURL()
                });

            // Görselleri ekle
            if (resimUrl) {
                shareEmbed.setImage(resimUrl);
            }
            
            if (finalThumbnailUrl) {
                shareEmbed.setThumbnail(finalThumbnailUrl);
            }

            // ÖNİZLEME SİSTEMİ - Butonlarla onay
            const previewEmbed = new EmbedBuilder()
                .setTitle('👁️ PACK PAYLAŞIM ÖNİZLEMESİ')
                .setDescription('Aşağıda pack paylaşımınızın önizlemesini görmektesiniz. Onaylıyor musunuz?')
                .setColor(0x00AEFF)
                .addFields(
                    { name: '📋 Pack Bilgileri', value: `**Tür:** ${packConfig.title}\n**Ad:** ${packAdi}\n**Kanal:** ${targetChannel}` },
                    { name: '📊 Teknik Detaylar', value: `**Boyut:** ${boyut}\n**Sürüm:** ${surum}\n**Uyumlu:** ${uyumluSurumler}` },
                    { name: '📢 Bildirim', value: packConfig.roleId ? `✅ ${roleMention} rolüne bildirim gidecek` : '❌ Bildirim rolü ayarlanmamış' },
                    { name: '🖼️ Görseller', value: `**Küçük Resim:** ${finalThumbnailUrl ? '✅ Ayarlı' : '❌ Yok'}\n**Büyük Resim:** ${resimUrl ? '✅ Ayarlı' : '❌ Yok'}` }
                )
                .setFooter({ text: 'Önizleme - 2 dakika içinde yanıt verin' });

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`confirm_${interaction.id}`)
                        .setLabel('✅ Paylaş')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId(`cancel_${interaction.id}`)
                        .setLabel('❌ İptal')
                        .setStyle(ButtonStyle.Danger)
                );

            // Önizleme göster
            await interaction.editReply({ 
                content: '**📝 PACK PAYLAŞIM ÖNİZLEMESİ**\nAşağıda paylaşımınızın nasıl görüneceğini görebilirsiniz:',
                embeds: [previewEmbed, shareEmbed],
                components: [row] 
            });

            // Buton interaction'ını bekle
            try {
                const buttonInteraction = await interaction.channel.awaitMessageComponent({
                    filter: i => i.user.id === interaction.user.id && 
                                (i.customId === `confirm_${interaction.id}` || i.customId === `cancel_${interaction.id}`),
                    time: 120000, // 2 dakika
                });

                await buttonInteraction.deferUpdate();

                if (buttonInteraction.customId === `confirm_${interaction.id}`) {
                    // PAYLAŞIM ONAYLANDI
                    const messageContent = roleMention ? 
                        `${roleMention}\nYeni pack paylaşıldı! 🎉` : 
                        'Yeni pack paylaşıldı! 🎉';

                    await targetChannel.send({ 
                        content: messageContent,
                        embeds: [shareEmbed] 
                    });

                    await interaction.editReply({ 
                        content: `✅ ${packConfig.title} başarıyla ${targetChannel} kanalına paylaşıldı!${packConfig.roleId ? `\n📢 ${roleMention} rolüne bildirim gönderildi.` : ''}`,
                        embeds: [],
                        components: [] 
                    });

                    // Logger'a kaydet
                    if (logger) {
                        logger.info('Pack Paylaşıldı', `${interaction.user.tag} ${packConfig.title} paylaştı`, {
                            fields: [
                                { name: 'Pack Adı', value: packAdi },
                                { name: 'Tür', value: packTuru },
                                { name: 'Kanal', value: targetChannel.name },
                                { name: 'Bildirim Rolü', value: packConfig.roleId ? 'Evet' : 'Hayır' },
                                { name: 'Küçük Resim', value: finalThumbnailUrl ? 'Sunucu Resmi' : 'Özel' }
                            ],
                            thumbnail: interaction.user.displayAvatarURL()
                        });
                    }

                } else {
                    // İPTAL EDİLDİ
                    await interaction.editReply({ 
                        content: '❌ Pack paylaşımı iptal edildi.',
                        embeds: [],
                        components: [] 
                    });
                }

            } catch (collectorError) {
                // ZAMAN AŞIMI
                await interaction.editReply({ 
                    content: '⏰ Pack paylaşımı zaman aşımına uğradı. Lütfen komutu tekrar kullanın.',
                    embeds: [],
                    components: [] 
                });
            }

        } catch (error) {
            console.error('Paylaş komutu hatası:', error);
            
            if (logger) {
                logger.interactionError(interaction, error);
            }
            
            await interaction.editReply({ 
                content: '❌ Pack paylaşılırken bir hata oluştu! Lütfen daha sonra tekrar deneyin.' 
            });
        }
    }
};
