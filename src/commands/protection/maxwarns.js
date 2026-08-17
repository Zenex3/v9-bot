const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed } = require('../../utils/embed');
const { getProtection } = require('../../services/logService');
const { db } = require('../../utils/database');
const { L } = require('../../utils/i18n');

module.exports = {
  category: 'protection',
  descEn: 'Auto-punish when member reaches max warnings',
  data: new SlashCommandBuilder()
    .setName('maxwarns')
    .setDescription('عقوبة تلقائية عند اقصى تحذيرات')
    .setDescriptionLocalizations({ 'en-US': 'Auto-punish on max warnings' })
    .setDefaultMemberPermissions(8)
    .addBooleanOption((o) => o.setName('enabled').setDescription(L('x', 'مفعل؟', 'Enabled?')).setDescriptionLocalizations({ 'en-US': 'Enabled?' }).setRequired(true))
    .addIntegerOption((o) => o.setName('count').setDescription(L('x', 'عدد التحذيرات', 'Warning count')).setDescriptionLocalizations({ 'en-US': 'Warning count' }).setMinValue(1).setMaxValue(20))
    .addStringOption((o) => o.setName('punishment').setDescription(L('x', 'العقوبة', 'Punishment')).setDescriptionLocalizations({ 'en-US': 'Punishment' }).addChoices(
      { name: L('x', 'اخمات', 'Timeout'), value: 'mute' }, { name: L('x', 'كيك', 'Kick'), value: 'kick' }, { name: L('x', 'بان', 'Ban'), value: 'ban' })),
  async run(client, interaction) {
    const l = interaction.user.id;
    const enabled = interaction.options.getBoolean('enabled');
    const count = interaction.options.getInteger('count');
    const punishment = interaction.options.getString('punishment');
    const protection = getProtection(interaction.guild.id);

    protection.maxWarns = {
      enabled,
      count: count || protection.maxWarns?.count || 5,
      punishment: punishment || protection.maxWarns?.punishment || 'kick',
    };
    db.guilds.set(interaction.guild.id, 'protection', protection);

    const pNames = { mute: { ar: 'اخمات', en: 'Timeout' }, kick: { ar: 'كيك', en: 'Kick' }, ban: { ar: 'بان', en: 'Ban' } };
    const p = pNames[protection.maxWarns.punishment];

    await interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '⚠️ Max Warns', '⚠️ Max Warns'), L(l, `**الحالة:** ${enabled ? 'مفعل' : 'معطل'}\n**العدد:** ${protection.maxWarns.count}\n**العقوبة:** ${p.ar}`, `**Status:** ${enabled ? 'Enabled' : 'Disabled'}\n**Count:** ${protection.maxWarns.count}\n**Punishment:** ${p.en}`))] });
  },
};
