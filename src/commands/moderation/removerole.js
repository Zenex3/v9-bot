const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { embed, successEmbed, errorEmbed } = require('../../utils/embed');
const { L } = require('../../utils/i18n');
const config = require('../../../config.json');

module.exports = {
  category: 'moderation',
  descEn: 'Remove a role from a member',
  data: new SlashCommandBuilder()
    .setName('removerole')
    .setDescription('ازالة رول من عضو')
    .setDescriptionLocalizations({ 'en-US': 'Remove a role from a member' })
    .setDefaultMemberPermissions(8)
    .addUserOption((o) => o.setName('user').setDescription(L('x', 'العضو', 'Member')).setDescriptionLocalizations({ 'en-US': 'Member' }).setRequired(true))
    .addRoleOption((o) => o.setName('role').setDescription(L('x', 'الرول', 'Role')).setDescriptionLocalizations({ 'en-US': 'Role' }).setRequired(true)),
  botPermissions: [PermissionFlagsBits.ManageRoles],
  async run(client, interaction) {
    const l = interaction.user.id;
    const target = interaction.options.getUser('user');
    const role = interaction.options.getRole('role');
    const member = await interaction.guild.members.fetch(target.id).catch(() => null);
    if (!member) return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'العضو غير موجود', 'Member not found'))], ephemeral: true });
    const isOwner = config.owners.includes(interaction.user.id);
    if (!isOwner && role.position >= interaction.member.roles.highest.position) {
      return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'لا يمكنك ازالة رول اعلى من رولك', 'You cannot remove a role above yours'))], ephemeral: true });
    }
    if (!member.roles.cache.has(role.id)) {
      return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, `**${target.tag}** لا يمتلك هذا الرول`, `**${target.tag}** does not have this role`))], ephemeral: true });
    }

    try {
      await member.roles.remove(role);
    } catch {
      return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'فشل ازالة الرول', 'Failed to remove role'))], ephemeral: true });
    }
    await interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '✅ تم', '✅ Done'), L(l, `تمت ازالة ${role} من **${target.tag}**`, `Removed ${role} from **${target.tag}**`))] });
  },
};
