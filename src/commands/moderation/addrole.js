const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { embed, successEmbed, errorEmbed } = require('../../utils/embed');
const { L } = require('../../utils/i18n');
const config = require('../../../config.json');

module.exports = {
  category: 'moderation',
  descEn: 'Add a role to a member',
  data: new SlashCommandBuilder()
    .setName('addrole')
    .setDescription('اضافة رول لعضو')
    .setDescriptionLocalizations({ 'en-US': 'Add a role to a member' })
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
      return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'لا يمكنك اعطاء رول اعلى من رولك', 'You cannot give a role above yours'))], ephemeral: true });
    }
    if (member.roles.cache.has(role.id)) {
      return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, `**${target.tag}** يمتلك الرول بالفعل`, `**${target.tag}** already has this role`))], ephemeral: true });
    }

    try {
      await member.roles.add(role);
    } catch {
      return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'فشل اضافة الرول', 'Failed to add role'))], ephemeral: true });
    }
    await interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '✅ تم', '✅ Done'), L(l, `تمت اضافة ${role} لـ **${target.tag}**`, `Added ${role} to **${target.tag}**`))] });
  },
};
