const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { embed } = require('../../utils/embed');
const { L } = require('../../utils/i18n');

module.exports = {
  category: 'moderation',
  descEn: 'List all banned members',
  data: new SlashCommandBuilder()
    .setName('banlist')
    .setDescription('قائمة المحظورين')
    .setDescriptionLocalizations({ 'en-US': 'List all banned members' })
    .setDefaultMemberPermissions(8),
  cooldown: 3000,
  async run(client, interaction) {
    const l = interaction.user.id;
    const bans = await interaction.guild.bans.fetch().catch(() => null);
    if (!bans) return interaction.reply({ embeds: [embed(interaction.guild, { title: '❌', description: L(l, 'لا يمكن جلب قائمة الحظر', 'Could not fetch bans'), color: 'error' })], ephemeral: true });
    if (!bans.size) return interaction.reply({ embeds: [embed(interaction.guild, { title: '📋', description: L(l, 'لا يوجد محظورون', 'No banned members'), color: 'info' })], ephemeral: true });

    const pages = [];
    const list = [...bans.values()];
    for (let i = 0; i < list.length; i += 15) {
      pages.push(list.slice(i, i + 15));
    }

    const build = (page) =>
      embed(interaction.guild, {
        title: L(l, `📋 المحظورون`, `📋 Banned Members`),
        description: pages[page].map((b) => `${b.user.toString()} — \`${b.reason || L(l, 'بدون سبب', 'No reason')}\``).join('\n'),
        footer: { text: L(l, `صفحة ${page + 1} من ${pages.length}`, `Page ${page + 1} of ${pages.length}`) },
      });

    await interaction.reply({ embeds: [build(0)] });
  },
};
