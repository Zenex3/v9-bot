const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { embed } = require('../../utils/embed');
const { getSettingsAll, LOG_TYPES, LOG_TYPE_LABELS } = require('../../services/logService');
const { db } = require('../../utils/database');
const { L } = require('../../utils/i18n');

module.exports = {
  category: 'config',
  descEn: 'View server settings',
  data: new SlashCommandBuilder()
    .setName('settings')
    .setDescription('عرض اعدادات السيرفر')
    .setDescriptionLocalizations({ 'en-US': 'View server settings' })
    .setDefaultMemberPermissions(8),
  async run(client, interaction) {
    const l = interaction.user.id;
    const data = getSettingsAll(interaction.guild.id);
    const settings = data.settings || {};
    const protection = data.protection || {};

    const ch = (id) => (id ? `<#${id}>` : L(l, '❌ غير مضبوط', '❌ Not set'));

    const logs = settings.logs || {};
    const logLines = Object.keys(LOG_TYPES).map((t) => {
      const cfg = logs[LOG_TYPES[t]];
      const on = cfg?.enabled ? '✅' : '❌';
      return `${on} **${LOG_TYPE_LABELS[t].ar}**: ${cfg?.channel ? `<#${cfg.channel}>` : '—'}`;
    });

    const settingsEmbed = embed(interaction.guild, {
      title: `${L(l, '⚙️ اعدادات', '⚙️ Settings')} ${interaction.guild.name}`,
      fields: [
        { name: L(l, '📋 اللوجات (كل لوج لرومه)', '📋 Logs (each has its own channel)'), value: logLines.join('\n'), inline: false },
        { name: L(l, '👋 رسائل الترحيب', '👋 Welcome messages'), value: ch(settings.welcomeChannel), inline: true },
        { name: L(l, '👋 رسائل الوداع', '👋 Leave messages'), value: ch(settings.leaveChannel), inline: true },
        { name: L(l, '🎭 اوتو رول', '🎭 Auto role'), value: settings.autorole ? `<@&${settings.autorole}>` : '❌', inline: true },
        { name: L(l, '🛡️ رول الادارة', '🛡️ Mod role'), value: settings.modRole ? `<@&${settings.modRole}>` : '❌', inline: true },
        { name: L(l, '🛡️ الحماية', '🛡️ Protection'), value: [
          `**${L(l, 'انتي سبام', 'Anti-spam')}:** ${protection.antiSpam?.enabled ? '✅' : '❌'}`,
          `**${L(l, 'انتي لينك', 'Anti-link')}:** ${protection.antiLink?.enabled ? '✅' : '❌'}`,
          `**${L(l, 'انتي انفايت', 'Anti-invite')}:** ${protection.antiInvite?.enabled ? '✅' : '❌'}`,
          `**${L(l, 'فلترة كلمات', 'Bad words')}:** ${protection.badWords?.enabled ? '✅' : '❌'}`,
          `**${L(l, 'قوست بنق', 'Ghost ping')}:** ${protection.ghostPing?.enabled ? '✅' : '❌'}`,
          `**${L(l, 'انتي ريد', 'Anti-raid')}:** ${protection.antiRaid?.enabled ? '✅' : '❌'}`,
          `**${L(l, 'انتي نيوك', 'Anti-nuke')}:** ${protection.antiNuke?.enabled ? '✅' : '❌'}`,
          `**${L(l, 'انتي بوت', 'Anti-bot')}:** ${protection.antiBot?.enabled ? '✅' : '❌'}`,
          `**${L(l, 'انتي ويب هوك', 'Anti-webhook')}:** ${protection.antiWebhook?.enabled ? '✅' : '❌'}`,
          `**${L(l, 'انتي الت', 'Anti-alt')}:** ${protection.antiAlt?.enabled ? '✅' : '❌'}`,
          `**${L(l, 'اقصى تحذيرات', 'Max warns')}:** ${protection.maxWarns?.enabled ? `✅ (${protection.maxWarns.count})` : '❌'}`,
          `**${L(l, 'توثيق العضو', 'Verification')}:** ${protection.verification?.enabled ? '✅' : '❌'}`,
          `**${L(l, 'حماية الرولات', 'Role protect')}:** ${protection.roleProtect?.enabled ? '✅' : '❌'}`,
        ].join('\n'), inline: false },
      ],
    });
    await interaction.reply({ embeds: [settingsEmbed] });
  },
};
