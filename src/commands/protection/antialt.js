const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed } = require('../../utils/embed');
const { getProtection } = require('../../services/logService');
const { db } = require('../../utils/database');
const { L } = require('../../utils/i18n');

module.exports = {
  category: 'protection',
  descEn: 'Kick accounts younger than X days',
  data: new SlashCommandBuilder()
    .setName('antialt')
    .setDescription('منع الحسابات الجديدة')
    .setDescriptionLocalizations({ 'en-US': 'Block new/alt accounts' })
    .setDefaultMemberPermissions(8)
    .addBooleanOption((o) => o.setName('enabled').setDescription(L('x', 'مفعل؟', 'Enabled?')).setDescriptionLocalizations({ 'en-US': 'Enabled?' }).setRequired(true))
    .addIntegerOption((o) => o.setName('days').setDescription(L('x', 'عمر الحساب الادنى بالايام', 'Minimum account age in days')).setDescriptionLocalizations({ 'en-US': 'Minimum account age in days' }).setMinValue(1).setMaxValue(365)),
  async run(client, interaction) {
    const l = interaction.user.id;
    const enabled = interaction.options.getBoolean('enabled');
    const days = interaction.options.getInteger('days');
    const protection = getProtection(interaction.guild.id);

    protection.antiAlt = {
      enabled,
      maxAgeDays: days || protection.antiAlt?.maxAgeDays || 3,
    };
    db.guilds.set(interaction.guild.id, 'protection', protection);

    await interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '🕒 Anti-Alt', '🕒 Anti-Alt'), L(l, `**الحالة:** ${enabled ? 'مفعل' : 'معطل'}\n**عمر الحساب الادنى:** ${protection.antiAlt.maxAgeDays} يوم`, `**Status:** ${enabled ? 'Enabled' : 'Disabled'}\n**Min account age:** ${protection.antiAlt.maxAgeDays} days`))] });
  },
};
