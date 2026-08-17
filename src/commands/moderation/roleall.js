const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { embed, successEmbed, errorEmbed } = require('../../utils/embed');
const { sendModLog } = require('../../services/logService');
const { L } = require('../../utils/i18n');
const config = require('../../../config.json');

module.exports = {
  category: 'moderation',
  descEn: 'Give a role to all members',
  data: new SlashCommandBuilder()
    .setName('roleall')
    .setDescription('إعطاء رول لجميع الأعضاء')
    .setDescriptionLocalizations({ 'en-US': 'Give a role to all members' })
    .setDefaultMemberPermissions(8)
    .addRoleOption((o) => o.setName('role').setDescription(L('x', 'الرول', 'Role')).setDescriptionLocalizations({ 'en-US': 'Role' }).setRequired(true)),
  async run(client, interaction) {
    const l = interaction.user.id;
    const role = interaction.options.getRole('role');
    const isOwner = config.owners.includes(interaction.user.id);
    if (!isOwner && role.position >= interaction.member.roles.highest.position) {
      return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'لا يمكنك إدارة هذا الرول', 'You cannot manage this role'))], ephemeral: true });
    }
    if (role.managed) {
      return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'لا يمكن إعطاء رول تابع للتطبيقات', 'Cannot assign integration-managed roles'))], ephemeral: true });
    }

    await interaction.reply({ embeds: [embed(interaction.guild, { title: '⏳', description: L(l, 'جاري إعطاء الرول لكل الأعضاء...', 'Giving the role to all members...'), color: 'info' })] });

    const members = await interaction.guild.members.fetch();
    let added = 0;
    for (const m of members.values()) {
      if (m.user.bot || m.roles.cache.has(role.id)) continue;
      await m.roles.add(role).catch(() => null);
      added++;
    }

    await interaction.editReply({ embeds: [successEmbed(interaction.guild, L(l, '🎭 Roleall', '🎭 Roleall'), L(l, `تم إعطاء **${role.name}** لـ **${added}** عضو`, `Gave **${role.name}** to **${added}** members`))] });
    await sendModLog(interaction.guild, embed(interaction.guild, { title: L(l, '🎭 Roleall', '🎭 Roleall'), description: L(l, `**الرول:** ${role.name}\n**بواسطة:** ${interaction.user.tag}\n**الأعضاء:** ${added}`, `**Role:** ${role.name}\n**By:** ${interaction.user.tag}\n**Members:** ${added}`) }));
  },
};
