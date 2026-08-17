const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { embed, successEmbed, errorEmbed } = require('../../utils/embed');
const { getProtection } = require('../../services/logService');
const { db } = require('../../utils/database');
const { L } = require('../../utils/i18n');

module.exports = {
  category: 'protection',
  descEn: 'Protect roles from being edited or deleted',
  data: new SlashCommandBuilder()
    .setName('roleprotect')
    .setDescription('حماية الرولات من التعديل او الحذف')
    .setDescriptionLocalizations({ 'en-US': 'Protect roles from edits/deletion' })
    .setDefaultMemberPermissions(8)
    .addSubcommand((s) => s.setName('toggle').setDescription(L('x', 'تشغيل/ايقاف الحماية', 'Enable/disable protection')).setDescriptionLocalizations({ 'en-US': 'Enable/disable protection' }).addBooleanOption((o) => o.setName('enabled').setDescription(L('x', 'مفعل؟', 'Enabled?')).setDescriptionLocalizations({ 'en-US': 'Enabled?' }).setRequired(true)))
    .addSubcommand((s) => s.setName('add').setDescription(L('x', 'اضافة رول للحماية', 'Add a role')).setDescriptionLocalizations({ 'en-US': 'Add a role' }).addRoleOption((o) => o.setName('role').setDescription(L('x', 'الرول', 'Role')).setDescriptionLocalizations({ 'en-US': 'Role' }).setRequired(true)))
    .addSubcommand((s) => s.setName('remove').setDescription(L('x', 'ازالة رول من الحماية', 'Remove a role')).setDescriptionLocalizations({ 'en-US': 'Remove a role' }).addRoleOption((o) => o.setName('role').setDescription(L('x', 'الرول', 'Role')).setDescriptionLocalizations({ 'en-US': 'Role' }).setRequired(true)))
    .addSubcommand((s) => s.setName('list').setDescription(L('x', 'عرض الرولات المحمية', 'List protected roles')).setDescriptionLocalizations({ 'en-US': 'List protected roles' })),
  async run(client, interaction) {
    const l = interaction.user.id;
    const sub = interaction.options.getSubcommand();
    const protection = getProtection(interaction.guild.id);
    if (!protection.roleProtect) protection.roleProtect = { enabled: false, roles: [] };

    if (sub === 'toggle') {
      protection.roleProtect.enabled = interaction.options.getBoolean('enabled');
      db.guilds.set(interaction.guild.id, 'protection', protection);
      return interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '🛡️ Role Protect', '🛡️ Role Protect'), L(l, protection.roleProtect.enabled ? 'تم تفعيل حماية الرولات' : 'تم ايقاف حماية الرولات', protection.roleProtect.enabled ? 'Role protection enabled' : 'Role protection disabled'))] });
    }

    if (sub === 'add') {
      const role = interaction.options.getRole('role');
      if (role.managed) return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'لا يمكن حماية رول تابع للتطبيقات', 'Cannot protect integration roles'))], ephemeral: true });
      if (!protection.roleProtect.roles.includes(role.id)) protection.roleProtect.roles.push(role.id);
      db.guilds.set(interaction.guild.id, 'protection', protection);
      return interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '✅ تم', '✅ Done'), L(l, `${role} اضيف للحماية`, `${role} added to protection`))] });
    }

    if (sub === 'remove') {
      const role = interaction.options.getRole('role');
      protection.roleProtect.roles = protection.roleProtect.roles.filter((id) => id !== role.id);
      db.guilds.set(interaction.guild.id, 'protection', protection);
      return interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '✅ تم', '✅ Done'), L(l, `${role} ازيل من الحماية`, `${role} removed from protection`))] });
    }

    if (sub === 'list') {
      const roles = protection.roleProtect.roles.map((id) => interaction.guild.roles.cache.get(id)).filter(Boolean);
      return interaction.reply({ embeds: [embed(interaction.guild, {
        title: L(l, '🛡️ الرولات المحمية', '🛡️ Protected Roles'),
        description: roles.length ? roles.map((r) => `${r} — ${r.members.size} ${L(l, 'عضو', 'members')}`).join('\n') : L(l, 'لا توجد رولات محمية', 'No protected roles'),
      })] });
    }
  },
};
