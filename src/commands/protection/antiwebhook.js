const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed } = require('../../utils/embed');
const { getProtection } = require('../../services/logService');
const { db } = require('../../utils/database');
const { L } = require('../../utils/i18n');

module.exports = {
  category: 'protection',
  descEn: 'Block webhook creation',
  data: new SlashCommandBuilder()
    .setName('antiwebhook')
    .setDescription('حماية من انشاء الويب هوكس')
    .setDescriptionLocalizations({ 'en-US': 'Block webhook creation' })
    .setDefaultMemberPermissions(8)
    .addStringOption((o) => o.setName('state').setDescription(L('x', 'تشغيل/ايقاف', 'Enable/disable')).setDescriptionLocalizations({ 'en-US': 'Enable/disable' }).setRequired(true).addChoices({ name: L('x', 'تشغيل', 'Enable'), value: 'on' }, { name: L('x', 'ايقاف', 'Disable'), value: 'off' })),
  async run(client, interaction) {
    const l = interaction.user.id;
    const state = interaction.options.getString('state');
    const protection = getProtection(interaction.guild.id);
    if (!protection.antiWebhook) protection.antiWebhook = { enabled: false };
    protection.antiWebhook.enabled = state === 'on';
    db.guilds.set(interaction.guild.id, 'protection', protection);

    await interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '🔗 Anti-Webhook', '🔗 Anti-Webhook'), L(l, `**الحالة:** ${state === 'on' ? 'مفعل' : 'معطل'}`, `**Status:** ${state === 'on' ? 'Enabled' : 'Disabled'}`))] });
  },
};
