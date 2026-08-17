const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { embed, successEmbed } = require('../../utils/embed');
const { L } = require('../../utils/i18n');

module.exports = {
  category: 'moderation',
  descEn: 'Unban all banned members',
  data: new SlashCommandBuilder()
    .setName('unbanall')
    .setDescription('فك الحظر عن جميع المحظورين')
    .setDescriptionLocalizations({ 'en-US': 'Unban all banned members' })
    .setDefaultMemberPermissions(8),
  async run(client, interaction) {
    const l = interaction.user.id;
    const bans = await interaction.guild.bans.fetch().catch(() => null);
    if (!bans) return interaction.reply({ embeds: [embed(interaction.guild, { title: '❌', description: L(l, 'لا يمكن جلب قائمة الحظر', 'Could not fetch bans'), color: 'error' })], ephemeral: true });
    if (!bans.size) return interaction.reply({ embeds: [embed(interaction.guild, { title: 'ℹ️', description: L(l, 'لا يوجد محظورون', 'No banned members'), color: 'info' })], ephemeral: true });

    await interaction.reply({ embeds: [embed(interaction.guild, { title: '⏳', description: L(l, `جاري فك الحظر عن **${bans.size}** عضو...`, `Unbanning **${bans.size}** members...`), color: 'info' })] });

    let done = 0;
    for (const b of bans.values()) {
      await interaction.guild.bans.remove(b.user.id, 'Unban all').catch(() => null);
      done++;
    }

    await interaction.editReply({ embeds: [successEmbed(interaction.guild, L(l, '✅ Unban All', '✅ Unban All'), L(l, `تم فك الحظر عن **${done}** عضو`, `Unbanned **${done}** members`))] });
  },
};
