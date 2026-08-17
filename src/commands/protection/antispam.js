const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embed');
const { getProtection } = require('../../services/logService');
const { db } = require('../../utils/database');
const { L } = require('../../utils/i18n');

const PUNISHMENTS = {
  mute: { ar: '🔇 اخمات', en: '🔇 Timeout' },
  warn: { ar: '⚠️ تحذير', en: '⚠️ Warning' },
  kick: { ar: '👢 طرد', en: '👢 Kick' },
  ban: { ar: '🔨 حظر', en: '🔨 Ban' },
};

module.exports = {
  category: 'protection',
  descEn: 'Anti-spam protection',
  data: new SlashCommandBuilder()
    .setName('antispam')
    .setDescription('الحماية من السبام')
    .setDescriptionLocalizations({ 'en-US': 'Anti-spam protection' })
    .setDefaultMemberPermissions(8)
    .addStringOption((o) => o.setName('state').setDescription(L('x', 'تشغيل/ايقاف', 'Enable/disable')).setDescriptionLocalizations({ 'en-US': 'Enable/disable' }).setRequired(true).addChoices({ name: L('x', '✅ تشغيل', '✅ Enable'), value: 'on' }, { name: L('x', '❌ ايقاف', '❌ Disable'), value: 'off' }))
    .addIntegerOption((o) => o.setName('limit').setDescription(L('x', 'عدد الرسائل المسموحة', 'Allowed messages')).setDescriptionLocalizations({ 'en-US': 'Allowed messages' }).setMinValue(2).setMaxValue(30))
    .addStringOption((o) => o.setName('punishment').setDescription(L('x', 'العقوبة', 'Punishment')).setDescriptionLocalizations({ 'en-US': 'Punishment' }).addChoices(
      { name: '🔇 اخمات', value: 'mute' }, { name: '⚠️ تحذير', value: 'warn' }, { name: '👢 طرد', value: 'kick' }, { name: '🔨 حظر', value: 'ban' })),
  async run(client, interaction) {
    const l = interaction.user.id;
    const state = interaction.options.getString('state');
    const limit = interaction.options.getInteger('limit');
    const punishment = interaction.options.getString('punishment');
    const protection = getProtection(interaction.guild.id);

    protection.antiSpam.enabled = state === 'on';
    if (limit) protection.antiSpam.limit = limit;
    if (punishment) protection.antiSpam.punishment = punishment;
    db.guilds.set(interaction.guild.id, 'protection', protection);

    const p = PUNISHMENTS[punishment || protection.antiSpam.punishment] || { ar: protection.antiSpam.punishment, en: protection.antiSpam.punishment };
    await interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '🛡️ انتي سبام', '🛡️ Anti-Spam'), L(l, `**الحالة:** ${state === 'on' ? '✅ مفعل' : '❌ معطل'}\n**الحد:** ${limit || protection.antiSpam.limit} رسالة\n**العقوبة:** ${p.ar}`, `**Status:** ${state === 'on' ? '✅ Enabled' : '❌ Disabled'}\n**Limit:** ${limit || protection.antiSpam.limit} messages\n**Punishment:** ${p.en}`))] });
  },
};
