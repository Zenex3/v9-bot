const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { embed, successEmbed, errorEmbed } = require('../../utils/embed');
const { getSettings, LOG_TYPES, LOG_TYPE_LABELS } = require('../../services/logService');
const { db } = require('../../utils/database');
const { L } = require('../../utils/i18n');

const MANAGED_TYPES = Object.keys(LOG_TYPES);
const TYPE_CHOICES = MANAGED_TYPES.map((t) => ({ name: LOG_TYPE_LABELS[t].ar, value: t }));

function addTypeChoices(option) {
  return option
    .setName('type')
    .setDescription('نوع اللوج')
    .setDescriptionLocalizations({ 'en-US': 'Log type' })
    .setRequired(true)
    .addChoices(...TYPE_CHOICES);
}

module.exports = {
  category: 'config',
  descEn: 'Configure per-type logs (kick/ban/edit/delete/join/leave)',
  data: new SlashCommandBuilder()
    .setName('logs')
    .setDescription('اعداد لوجات السيرفر لكل نوع (كيك/بان/تعديل/حذف/دخول/خروج)')
    .setDescriptionLocalizations({ 'en-US': 'Configure server logs per type' })
    .setDefaultMemberPermissions(8)
    .addSubcommand((s) => s.setName('channel')
      .setDescription('تعيين روم اللوج وتفعيله لنوع معين')
      .setDescriptionLocalizations({ 'en-US': 'Set the log channel and enable it for a type' })
      .addStringOption(addTypeChoices)
      .addChannelOption((o) => o.setName('channel').setDescription(L('x', 'روم اللوج', 'Log channel')).setDescriptionLocalizations({ 'en-US': 'Log channel' }).setRequired(true)))
    .addSubcommand((s) => s.setName('on')
      .setDescription('تفعيل لوج لنوع معين')
      .setDescriptionLocalizations({ 'en-US': 'Enable a log type' })
      .addStringOption(addTypeChoices))
    .addSubcommand((s) => s.setName('off')
      .setDescription('اطفاء لوج لنوع معين')
      .setDescriptionLocalizations({ 'en-US': 'Disable a log type' })
      .addStringOption(addTypeChoices))
    .addSubcommand((s) => s.setName('list')
      .setDescription('عرض حالة كل اللوجات')
      .setDescriptionLocalizations({ 'en-US': 'Show status of all logs' })),
  async run(client, interaction) {
    const l = interaction.user.id;
    const sub = interaction.options.getSubcommand();
    const settings = getSettings(interaction.guild.id);

    if (sub === 'list') {
      const lines = MANAGED_TYPES.map((t) => {
        const cfg = settings.logs[LOG_TYPES[t]];
        const on = cfg?.enabled ? '✅' : '❌';
        const ch = cfg?.channel ? `<#${cfg.channel}>` : L(l, 'غير محدد', 'Not set');
        return `${on} **${LOG_TYPE_LABELS[t].ar}**: ${ch}`;
      });
      return interaction.reply({
        embeds: [embed(interaction.guild, {
          title: L(l, '📋 اعدادات اللوجات', '📋 Logs settings'),
          description: `${L(l, 'كل لوج له رومه الخاص ويمكن تشغيله/اطفائه بمفرده', 'Each log has its own channel and can be toggled individually')}\n\n${lines.join('\n')}`,
        })],
      });
    }

    const type = interaction.options.getString('type');
    const key = LOG_TYPES[type];
    if (!key) {
      return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'نوع لوج غير صحيح', 'Invalid log type'))], ephemeral: true });
    }
    const label = LOG_TYPE_LABELS[type];
    const cfg = settings.logs[key];

    if (sub === 'channel') {
      const channel = interaction.options.getChannel('channel');
      settings.logs[key] = { enabled: true, channel: channel.id };
      db.guilds.set(interaction.guild.id, 'settings', settings);
      return interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '✅ تم الاعداد', '✅ Done'), L(l, `تم تفعيل لوج **${label.ar}** في ${channel}`, `Enabled **${label.en}** log in ${channel}`))] });
    }

    if (sub === 'on') {
      if (!cfg.channel) {
        return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'حدد روم اللوج الأول عبر `/logs channel`', 'Set the log channel first using `/logs channel`'))], ephemeral: true });
      }
      cfg.enabled = true;
      db.guilds.set(interaction.guild.id, 'settings', settings);
      return interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '✅ مفعل', '✅ Enabled'), L(l, `لوج **${label.ar}** يعمل الآن في <#${cfg.channel}>`, `**${label.en}** log is now enabled in <#${cfg.channel}>`))] });
    }

    if (sub === 'off') {
      cfg.enabled = false;
      db.guilds.set(interaction.guild.id, 'settings', settings);
      return interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '✅ متوقف', '✅ Disabled'), L(l, `لوج **${label.ar}** تم اطفاؤه`, `**${label.en}** log has been disabled`))] });
    }
  },
};
