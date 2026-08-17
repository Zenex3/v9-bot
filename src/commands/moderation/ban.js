const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { embed, successEmbed, errorEmbed } = require('../../utils/embed');
const { hasHigherRole } = require('../../utils/functions');
const { sendModLog } = require('../../services/logService');
const { L } = require('../../utils/i18n');

module.exports = {
  category: 'moderation',
  descEn: 'Ban a member from the server',
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('حظر عضو من السيرفر')
    .setDescriptionLocalizations({ 'en-US': 'Ban a member from the server' })
    .setDefaultMemberPermissions(8)
    .addUserOption((o) => o.setName('user').setDescription(L('x', 'العضو المطلوب حظره', 'Member to ban')).setDescriptionLocalizations({ 'en-US': 'Member to ban' }).setRequired(true))
    .addStringOption((o) => o.setName('reason').setDescription(L('x', 'السبب (اختياري)', 'Reason (optional)')).setDescriptionLocalizations({ 'en-US': 'Reason (optional)' })),
  botPermissions: [PermissionFlagsBits.BanMembers],
  async run(client, interaction) {
    const l = interaction.user.id;
    const target = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || L(l, 'غير محدد', 'Not specified');
    const member = await interaction.guild.members.fetch(target.id).catch(() => null);

    if (member && (member.id === interaction.user.id || member.id === client.user.id)) {
      return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'لا يمكنك حظر هذا العضو', 'You cannot ban this member'))], ephemeral: true });
    }
    if (member && !hasHigherRole(interaction.guild.members.me, member)) {
      return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'رول البوت تحت رول هذا العضو', 'Bot role is below this member role'))], ephemeral: true });
    }

    try {
      await interaction.guild.members.ban(target.id, { reason: `${interaction.user.tag}: ${reason}` });
    } catch (e) {
      const msg = e?.message || L(l, 'غير معروف', 'Unknown');
      return interaction.reply({ embeds: [errorEmbed(interaction.guild, L(l, '❌ فشل الحظر', '❌ Ban failed'), L(l, `**السبب التقني:** \`${msg}\``, `**Error:** \`${msg}\``))], ephemeral: true });
    }

    const done = successEmbed(interaction.guild, L(l, '🔨 تم الحظر', '🔨 Banned'), L(l, `**${target.tag}** تم حظره\n**السبب:** ${reason}`, `**${target.tag}** has been banned\n**Reason:** ${reason}`));
    await interaction.reply({ embeds: [done] });

    await sendModLog(interaction.guild, embed(interaction.guild, {
      title: L(l, '🔨 بان', '🔨 Ban'),
      description: L(l, `**العضو:** ${target.tag} (${target})\n**بواسطة:** ${interaction.user.tag}\n**السبب:** ${reason}`, `**Member:** ${target.tag} (${target})\n**By:** ${interaction.user.tag}\n**Reason:** ${reason}`),
      color: 'error',
    }));
  },
};
