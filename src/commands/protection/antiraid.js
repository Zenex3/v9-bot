const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed } = require('../../utils/embed');
const { getProtection } = require('../../services/logService');
const { db } = require('../../utils/database');
const { L } = require('../../utils/i18n');

module.exports = {
  category: 'protection',
  descEn: 'Anti-raid protection',
  data: new SlashCommandBuilder()
    .setName('antiraid')
    .setDescription('الحماية من الريد')
    .setDescriptionLocalizations({ 'en-US': 'Anti-raid protection' })
    .setDefaultMemberPermissions(8)
    .addStringOption((o) => o.setName('state').setDescription(L('x', 'تشغيل/ايقاف', 'Enable/disable')).setDescriptionLocalizations({ 'en-US': 'Enable/disable' }).setRequired(true).addChoices({ name: L('x', '✅ تشغيل', '✅ Enable'), value: 'on' }, { name: L('x', '❌ ايقاف', '❌ Disable'), value: 'off' }))
    .addIntegerOption((o) => o.setName('limit').setDescription(L('x', 'الحد الاقصى للدخول', 'Max joins')).setDescriptionLocalizations({ 'en-US': 'Max joins' }).setMinValue(2).setMaxValue(50))
    .addIntegerOption((o) => o.setName('window').setDescription(L('x', 'المدة بالثواني', 'Window in seconds')).setDescriptionLocalizations({ 'en-US': 'Window in seconds' }).setMinValue(5).setMaxValue(120)),
  async run(client, interaction) {
    const l = interaction.user.id;
    const state = interaction.options.getString('state');
    const limit = interaction.options.getInteger('limit');
    const window = interaction.options.getInteger('window');
    const protection = getProtection(interaction.guild.id);

    protection.antiRaid.enabled = state === 'on';
    if (limit) protection.antiRaid.limit = limit;
    if (window) protection.antiRaid.window = window * 1000;
    db.guilds.set(interaction.guild.id, 'protection', protection);

    await interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '🛡️ انتي ريد', '🛡️ Anti-Raid'), L(l, `**الحالة:** ${state === 'on' ? '✅ مفعل' : '❌ معطل'}\n**الحد:** ${limit || protection.antiRaid.limit} عضو\n**المدة:** ${(window || protection.antiRaid.window / 1000)} ثانية`, `**Status:** ${state === 'on' ? '✅ Enabled' : '❌ Disabled'}\n**Limit:** ${limit || protection.antiRaid.limit} members\n**Window:** ${(window || protection.antiRaid.window / 1000)} seconds`))] });
  },
};
