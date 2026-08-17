const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { embed, successEmbed, errorEmbed } = require('../../utils/embed');
const { sendModLog } = require('../../services/logService');
const { L } = require('../../utils/i18n');

module.exports = {
  category: 'moderation',
  descEn: 'Remove timeout from a member',
  data: new SlashCommandBuilder()
    .setName('untimeout')
    .setDescription('فك الاخمات عن عضو')
    .setDescriptionLocalizations({ 'en-US': 'Remove timeout from a member' })
    .setDefaultMemberPermissions(8)
    .addUserOption((o) => o.setName('user').setDescription(L('x', 'العضو', 'Member')).setDescriptionLocalizations({ 'en-US': 'Member' }).setRequired(true)),
  botPermissions: [PermissionFlagsBits.ModerateMembers],
  async run(client, interaction) {
    const l = interaction.user.id;
    const target = interaction.options.getUser('user');
    const member = await interaction.guild.members.fetch(target.id).catch(() => null);
    if (!member) return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'العضو غير موجود', 'Member not found'))], ephemeral: true });

    try {
      await member.timeout(null);
    } catch {
      return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'فشل فك الاخمات', 'Failed to remove timeout'))], ephemeral: true });
    }

    await interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '🔊 تم فك الاخمات', '🔊 Timeout removed'), L(l, `**${target.tag}** عاد للكتابة`, `**${target.tag}** can chat again`))] });
    await sendModLog(interaction.guild, embed(interaction.guild, { title: L(l, '🔊 فك اخمات', '🔊 Untimeout'), description: L(l, `**العضو:** ${target.tag}\n**بواسطة:** ${interaction.user.tag}`, `**Member:** ${target.tag}\n**By:** ${interaction.user.tag}`), color: 'success' }));
  },
};
