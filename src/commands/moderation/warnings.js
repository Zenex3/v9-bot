const { SlashCommandBuilder } = require('discord.js');
const { embed } = require('../../utils/embed');
const { formatDate } = require('../../utils/functions');
const { db, memberKey, getMember } = require('../../utils/database');
const { L } = require('../../utils/i18n');

module.exports = {
  category: 'moderation',
  descEn: 'Show a member warnings',
  data: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('عرض تحذيرات عضو')
    .setDescriptionLocalizations({ 'en-US': 'Show a member warnings' })
    .addUserOption((o) => o.setName('user').setDescription(L('x', 'العضو', 'Member')).setDescriptionLocalizations({ 'en-US': 'Member' }).setRequired(true))
    .setDefaultMemberPermissions(8),
  cooldown: 5000,
  async run(client, interaction) {
    const l = interaction.user.id;
    const target = interaction.options.getUser('user');
    const data = getMember(interaction.guild.id, target.id);
    const warns = Array.isArray(data.warns) ? data.warns : [];

    const warnEmbed = embed(interaction.guild, {
      title: `${L(l, '⚠️ تحذيرات', '⚠️ Warnings')} ${target.tag}`,
      description: warns.length ? warns.map((w, i) => `**${i + 1}.** ${w.reason}\n> ${L(l, 'بواسطة', 'By')} ${w.mod} — ${formatDate(w.date)}`).join('\n\n') : L(l, 'لا توجد تحذيرات 🎉', 'No warnings 🎉'),
    });
    await interaction.reply({ embeds: [warnEmbed] });
  },
};
