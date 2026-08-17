const { SlashCommandBuilder } = require('discord.js');
const { embed } = require('../../utils/embed');
const { L } = require('../../utils/i18n');

module.exports = {
  category: 'info',
  descEn: 'Check bot connection speed',
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('قياس سرعة اتصال البوت')
    .setDescriptionLocalizations({ 'en-US': 'Check bot connection speed' }),
  cooldown: 3000,
  async run(client, interaction) {
    const l = interaction.user.id;
    const start = Date.now();
    await interaction.reply({ embeds: [embed(interaction.guild, { title: L(l, '🏓 بونق!', '🏓 Pong!'), description: L(l, 'جاري القياس...', 'Measuring...') })] });
    const latency = Date.now() - start;
    const pingEmbed = embed(interaction.guild, {
      title: L(l, '🏓 بونق!', '🏓 Pong!'),
      description: [
        `**${L(l, 'الزمن', 'Latency')}:** ${latency}ms`,
        `**API:** ${Math.round(client.ws.ping)}ms`,
        '',
        latency < 150 ? L(l, 'سرعة ممتازة', 'Excellent speed') : latency < 400 ? L(l, 'سرعة جيدة', 'Good speed') : L(l, 'سرعة بطيئة', 'Slow speed'),
      ].join('\n'),
    });
    await interaction.editReply({ embeds: [pingEmbed] });
  },
};
