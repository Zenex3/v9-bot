const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { embed, successEmbed, errorEmbed } = require('../../utils/embed');
const { getProtection } = require('../../services/logService');
const { db } = require('../../utils/database');
const { isOwner } = require('../../utils/functions');
const { L } = require('../../utils/i18n');

module.exports = {
  category: 'protection',
  descEn: 'Anti-nuke protection (restores deleted channels/roles/bans)',
  data: new SlashCommandBuilder()
    .setName('antinuke')
    .setDescription('حماية ضد النيوك (استعادة المحذوفات)')
    .setDescriptionLocalizations({ 'en-US': 'Anti-nuke protection' })
    .setDefaultMemberPermissions(8)
    .addSubcommand((s) => s.setName('toggle').setDescription(L('x', 'تشغيل/ايقاف', 'Enable/disable')).setDescriptionLocalizations({ 'en-US': 'Enable/disable' }).addBooleanOption((o) => o.setName('enabled').setDescription(L('x', 'مفعل؟', 'Enabled?')).setDescriptionLocalizations({ 'en-US': 'Enabled?' }).setRequired(true)))
    .addSubcommand((s) => s.setName('whitelist').setDescription(L('x', 'اضافة عضو للقائمة البيضاء', 'Whitelist a member')).setDescriptionLocalizations({ 'en-US': 'Whitelist a member' }).addUserOption((o) => o.setName('user').setDescription(L('x', 'العضو', 'Member')).setDescriptionLocalizations({ 'en-US': 'Member' }).setRequired(true)))
    .addSubcommand((s) => s.setName('unwhitelist').setDescription(L('x', 'ازالة عضو من القائمة البيضاء', 'Remove from whitelist')).setDescriptionLocalizations({ 'en-US': 'Remove from whitelist' }).addUserOption((o) => o.setName('user').setDescription(L('x', 'العضو', 'Member')).setDescriptionLocalizations({ 'en-US': 'Member' }).setRequired(true))),
  async run(client, interaction) {
    const l = interaction.user.id;
    const sub = interaction.options.getSubcommand();
    const protection = getProtection(interaction.guild.id);
    if (!protection.antiNuke) protection.antiNuke = { enabled: false, whitelist: [] };

    if (sub === 'toggle') {
      protection.antiNuke.enabled = interaction.options.getBoolean('enabled');
      db.guilds.set(interaction.guild.id, 'protection', protection);
      return interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '🛡️ Anti-Nuke', '🛡️ Anti-Nuke'), L(l, protection.antiNuke.enabled ? 'تم تفعيل الحماية ضد النيوك' : 'تم ايقاف الحماية ضد النيوك', protection.antiNuke.enabled ? 'Anti-nuke enabled' : 'Anti-nuke disabled'))] });
    }

    if (sub === 'whitelist') {
      const user = interaction.options.getUser('user');
      if (isOwner(user.id)) return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'لا يمكنك اعطاء هذا الشخص', 'Cannot whitelist this user'))], ephemeral: true });
      if (!protection.antiNuke.whitelist.includes(user.id)) protection.antiNuke.whitelist.push(user.id);
      db.guilds.set(interaction.guild.id, 'protection', protection);
      return interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '✅ تم', '✅ Done'), L(l, `${user} اضيف للقائمة البيضاء`, `${user} added to whitelist`))] });
    }

    if (sub === 'unwhitelist') {
      const user = interaction.options.getUser('user');
      protection.antiNuke.whitelist = protection.antiNuke.whitelist.filter((id) => id !== user.id);
      db.guilds.set(interaction.guild.id, 'protection', protection);
      return interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '✅ تم', '✅ Done'), L(l, `${user} ازيل من القائمة البيضاء`, `${user} removed from whitelist`))] });
    }
  },
};
