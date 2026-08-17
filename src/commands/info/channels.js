const { SlashCommandBuilder } = require('discord.js');
const { embed } = require('../../utils/embed');
const { formatNumber } = require('../../utils/functions');
const { L } = require('../../utils/i18n');

module.exports = {
  category: 'info',
  descEn: 'List server channels',
  data: new SlashCommandBuilder()
    .setName('channels')
    .setDescription('قائمة قنوات السيرفر')
    .setDescriptionLocalizations({ 'en-US': 'List server channels' }),
  cooldown: 5000,
  async run(client, interaction) {
    const l = interaction.user.id;
    const text = interaction.guild.channels.cache.filter((c) => c.isTextBased()).size;
    const voice = interaction.guild.channels.cache.filter((c) => c.isVoiceBased()).size;
    const categories = interaction.guild.channels.cache.filter((c) => c.type === 4).size;

    const chEmbed = embed(interaction.guild, {
      title: `${L(l, '📚 قنوات', '📚 Channels')} ${interaction.guild.name}`,
      fields: [
        { name: L(l, '📝 نصية', '📝 Text'), value: formatNumber(text), inline: true },
        { name: L(l, '🔊 صوتية', '🔊 Voice'), value: formatNumber(voice), inline: true },
        { name: L(l, '📂 كاتيجوريات', '📂 Categories'), value: formatNumber(categories), inline: true },
      ],
    });
    await interaction.reply({ embeds: [chEmbed] });
  },
};
