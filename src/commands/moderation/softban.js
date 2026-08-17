const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { embed, successEmbed, errorEmbed } = require('../../utils/embed');
const { hasHigherRole } = require('../../utils/functions');
const { sendModLog } = require('../../services/logService');
const { L } = require('../../utils/i18n');

module.exports = {
  category: 'moderation',
  descEn: 'Softban a member (ban then unban)',
  data: new SlashCommandBuilder()
    .setName('softban')
    .setDescription('حظر مؤقت ثم فك الحظر (مسح الرسائل)')
    .setDescriptionLocalizations({ 'en-US': 'Softban a member (ban then unban)' })
    .setDefaultMemberPermissions(8)
    .addUserOption((o) => o.setName('user').setDescription(L('x', 'العضو', 'Member')).setDescriptionLocalizations({ 'en-US': 'Member' }).setRequired(true))
    .addIntegerOption((o) => o.setName('days').setDescription(L('x', 'عدد أيام الرسائل المحذوفة', 'Days of messages to delete')).setDescriptionLocalizations({ 'en-US': 'Days of messages to delete' }).setMinValue(0).setMaxValue(7))
    .addStringOption((o) => o.setName('reason').setDescription(L('x', 'السبب', 'Reason')).setDescriptionLocalizations({ 'en-US': 'Reason' })),
  botPermissions: [PermissionFlagsBits.BanMembers],
  async run(client, interaction) {
    const l = interaction.user.id;
    const target = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || L(l, 'بدون سبب', 'No reason');
    const days = interaction.options.getInteger('days') ?? 1;
    const member = await interaction.guild.members.fetch(target.id).catch(() => null);

    if (member && (member.id === interaction.user.id || member.id === client.user.id)) {
      return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'لا يمكنك حظر هذا العضو', 'You cannot softban this member'))], ephemeral: true });
    }
    if (member && !hasHigherRole(interaction.guild.members.me, member)) {
      return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'رول البوت تحت رول هذا العضو', 'Bot role is below this member role'))], ephemeral: true });
    }

    try {
      await interaction.guild.bans.create(target.id, { reason: `Softban | ${interaction.user.tag} | ${reason}`, deleteMessageSeconds: days * 86400 });
      await interaction.guild.bans.remove(target.id, 'Softban complete').catch(() => null);
    } catch (e) {
      const msg = e?.message || L(l, 'غير معروف', 'Unknown');
      return interaction.reply({ embeds: [errorEmbed(interaction.guild, L(l, '❌ فشل الـ Softban', '❌ Softban failed'), L(l, `**السبب التقني:** \`${msg}\``, `**Error:** \`${msg}\``))], ephemeral: true });
    }

    await interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '🧹 Softban', '🧹 Softban'), L(l, `**${target.tag}** تم softban بنجاح`, `**${target.tag}** has been softbanned`))] });
    await sendModLog(interaction.guild, embed(interaction.guild, { title: L(l, '🧹 Softban', '🧹 Softban'), description: L(l, `**العضو:** ${target.tag}\n**بواسطة:** ${interaction.user.tag}\n**السبب:** ${reason}`, `**Member:** ${target.tag}\n**By:** ${interaction.user.tag}\n**Reason:** ${reason}`) }));
  },
};
