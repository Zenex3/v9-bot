const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { embed, successEmbed, errorEmbed } = require('../../utils/embed');
const { hasHigherRole } = require('../../utils/functions');
const { sendModLog } = require('../../services/logService');
const { L } = require('../../utils/i18n');

module.exports = {
  category: 'moderation',
  descEn: 'Kick a member from the server',
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('طرد عضو من السيرفر')
    .setDescriptionLocalizations({ 'en-US': 'Kick a member from the server' })
    .setDefaultMemberPermissions(8)
    .addUserOption((o) => o.setName('user').setDescription(L('x', 'العضو المطلوب طرده', 'Member to kick')).setDescriptionLocalizations({ 'en-US': 'Member to kick' }).setRequired(true))
    .addStringOption((o) => o.setName('reason').setDescription(L('x', 'السبب (اختياري)', 'Reason (optional)')).setDescriptionLocalizations({ 'en-US': 'Reason (optional)' })),
  botPermissions: [PermissionFlagsBits.KickMembers],
  async run(client, interaction) {
    const l = interaction.user.id;
    const target = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || L(l, 'غير محدد', 'Not specified');
    const member = await interaction.guild.members.fetch(target.id).catch(() => null);

    if (!member) return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'العضو غير موجود', 'Member not found'))], ephemeral: true });
    if (member.id === interaction.user.id || member.id === client.user.id) {
      return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'لا يمكنك طرد هذا العضو', 'You cannot kick this member'))], ephemeral: true });
    }
    if (!hasHigherRole(interaction.guild.members.me, member)) {
      return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'رول البوت تحت رول هذا العضو — انزل رول العضو تحت رول البوت او اعمل رول اعلى للبوت', 'Bot role is below this member role — move the member role below the bot role or give the bot a higher role'))], ephemeral: true });
    }

    try {
      await member.kick(`${interaction.user.tag}: ${reason}`);
    } catch (e) {
      const msg = e?.message || L(l, 'غير معروف', 'Unknown');
      return interaction.reply({ embeds: [errorEmbed(interaction.guild, L(l, '❌ فشل الطرد', '❌ Kick failed'), L(l, `**${target.tag}** روله اعلى من رول البوت او يساويه — ديسكورد بيرفض\n\n**السبب التقني:** \`${msg}\`\n\n**الحل:** اعمل رول جديد للبوت فوق كل الرولات، أو انزل رول المستهدف تحت رول البوت`, `**${target.tag}** role is above or equal to the bot role — Discord refuses\n\n**Error:** \`${msg}\`\n\n**Fix:** give the bot a role above everything, or move the target role below the bot role`))] });
    }

    await interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '👢 تم الطرد', '👢 Kicked'), L(l, `**${target.tag}** تم طرده\n**السبب:** ${reason}`, `**${target.tag}** has been kicked\n**Reason:** ${reason}`))] });
    await sendModLog(interaction.guild, embed(interaction.guild, { title: L(l, '👢 كيك', '👢 Kick'), description: L(l, `**العضو:** ${target.tag}\n**بواسطة:** ${interaction.user.tag}\n**السبب:** ${reason}`, `**Member:** ${target.tag}\n**By:** ${interaction.user.tag}\n**Reason:** ${reason}`), color: 'warning' }));
  },
};
