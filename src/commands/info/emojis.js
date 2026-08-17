const { SlashCommandBuilder } = require('discord.js');
const { embed, errorEmbed } = require('../../utils/embed');
const { L } = require('../../utils/i18n');

module.exports = {
  category: 'info',
  descEn: 'List server emojis',
  data: new SlashCommandBuilder()
    .setName('emojis')
    .setDescription('قائمة إيموجيات السيرفر')
    .setDescriptionLocalizations({ 'en-US': 'List server emojis' }),
  cooldown: 3000,
  async run(client, interaction) {
    const l = interaction.user.id;
    const emojis = interaction.guild.emojis.cache;
    const animated = emojis.filter((e) => e.animated);
    const normal = emojis.filter((e) => !e.animated);
    if (!emojis.size) return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'لا توجد إيموجيات في السيرفر', 'No emojis in this server'))], ephemeral: true });

    const emojiEmbed = embed(interaction.guild, {
      title: L(l, `😀 إيموجيات السيرفر`, `😀 Server Emojis`),
      description: [
        `**${L(l, 'الإجمالي', 'Total')}:** ${emojis.size}`,
        `**${L(l, 'متحركة', 'Animated')}:** ${animated.size}`,
        `**${L(l, 'عادية', 'Static')}:** ${normal.size}`,
        '',
        normal.first(30).map((e) => e.toString()).join(' ') || '—',
        animated.first(30).map((e) => e.toString()).join(' ') || '',
      ].join('\n'),
    });
    await interaction.reply({ embeds: [emojiEmbed] });
  },
};
