const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed } = require('../../utils/embed');
const { getSettings } = require('../../services/logService');
const { db } = require('../../utils/database');
const { L } = require('../../utils/i18n');

const LOG_CHANNEL_SUBS = {
  joinlog: { keys: ['joinLog'], ar: 'لوج الانضمام', en: 'Join log' },
  leavelog: { keys: ['leaveLog'], ar: 'لوج المغادرة', en: 'Leave log' },
  messagelog: { keys: ['messageEditLog', 'messageDeleteLog'], ar: 'لوج الرسائل', en: 'Message log' },
  modlog: { keys: ['modLog'], ar: 'سجل الادارة', en: 'Moderation log' },
  guildlog: { keys: ['guildLog'], ar: 'لوج السيرفر', en: 'Guild log' },
};

module.exports = {
  category: 'config',
  descEn: 'Set up the bot system in your server',
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('اعداد نظام البوت في السيرفر')
    .setDescriptionLocalizations({ 'en-US': 'Set up the bot system in your server' })
    .setDefaultMemberPermissions(8)
    .addSubcommand((s) => s.setName('modlog').setDescription(L('x', 'تفعيل لوج الادارة (تحذيرات/حماية) في قناة', 'Enable moderation log (warns/protection) in a channel')).setDescriptionLocalizations({ 'en-US': 'Enable moderation log (warns/protection) in a channel' }).addChannelOption((o) => o.setName('channel').setDescription(L('x', 'القناة', 'Channel')).setDescriptionLocalizations({ 'en-US': 'Channel' }).setRequired(true)))
    .addSubcommand((s) => s.setName('joinlog').setDescription(L('x', 'تفعيل لوج الانضمام في قناة', 'Enable join log in a channel')).setDescriptionLocalizations({ 'en-US': 'Enable join log in a channel' }).addChannelOption((o) => o.setName('channel').setDescription(L('x', 'القناة', 'Channel')).setDescriptionLocalizations({ 'en-US': 'Channel' }).setRequired(true)))
    .addSubcommand((s) => s.setName('leavelog').setDescription(L('x', 'تفعيل لوج المغادرة في قناة', 'Enable leave log in a channel')).setDescriptionLocalizations({ 'en-US': 'Enable leave log in a channel' }).addChannelOption((o) => o.setName('channel').setDescription(L('x', 'القناة', 'Channel')).setDescriptionLocalizations({ 'en-US': 'Channel' }).setRequired(true)))
    .addSubcommand((s) => s.setName('messagelog').setDescription(L('x', 'تفعيل لوج الرسائل (حذف/تعديل) في قناة', 'Enable message log (delete/edit) in a channel')).setDescriptionLocalizations({ 'en-US': 'Enable message log (delete/edit) in a channel' }).addChannelOption((o) => o.setName('channel').setDescription(L('x', 'القناة', 'Channel')).setDescriptionLocalizations({ 'en-US': 'Channel' }).setRequired(true)))
    .addSubcommand((s) => s.setName('guildlog').setDescription(L('x', 'تفعيل لوج السيرفر (رولات/قنوات/صوت) في قناة', 'Enable guild log (roles/channels/voice) in a channel')).setDescriptionLocalizations({ 'en-US': 'Enable guild log (roles/channels/voice) in a channel' }).addChannelOption((o) => o.setName('channel').setDescription(L('x', 'القناة', 'Channel')).setDescriptionLocalizations({ 'en-US': 'Channel' }).setRequired(true)))
    .addSubcommand((s) => s.setName('welcome').setDescription(L('x', 'قناة رسائل الترحيب', 'Welcome message channel')).setDescriptionLocalizations({ 'en-US': 'Welcome message channel' }).addChannelOption((o) => o.setName('channel').setDescription(L('x', 'قناة الترحيب', 'Welcome channel')).setDescriptionLocalizations({ 'en-US': 'Welcome channel' }).setRequired(true)))
    .addSubcommand((s) => s.setName('leave').setDescription(L('x', 'قناة رسائل الوداع', 'Leave message channel')).setDescriptionLocalizations({ 'en-US': 'Leave message channel' }).addChannelOption((o) => o.setName('channel').setDescription(L('x', 'قناة الوداع', 'Leave channel')).setDescriptionLocalizations({ 'en-US': 'Leave channel' }).setRequired(true)))
    .addSubcommand((s) => s.setName('autorole').setDescription(L('x', 'رول الاعضاء الجدد', 'Auto role for new members')).setDescriptionLocalizations({ 'en-US': 'Auto role for new members' }).addRoleOption((o) => o.setName('role').setDescription(L('x', 'الرول', 'Role')).setDescriptionLocalizations({ 'en-US': 'Role' }).setRequired(true)))
    .addSubcommand((s) => s.setName('modrole').setDescription(L('x', 'رول الادارة', 'Moderator role')).setDescriptionLocalizations({ 'en-US': 'Moderator role' }).addRoleOption((o) => o.setName('role').setDescription(L('x', 'الرول', 'Role')).setDescriptionLocalizations({ 'en-US': 'Role' }).setRequired(true))),
  async run(client, interaction) {
    const l = interaction.user.id;
    const sub = interaction.options.getSubcommand();
    const settings = getSettings(interaction.guild.id);

    if (LOG_CHANNEL_SUBS[sub]) {
      const channel = interaction.options.getChannel('channel');
      const conf = LOG_CHANNEL_SUBS[sub];
      for (const key of conf.keys) {
        settings.logs[key] = { enabled: true, channel: channel.id };
      }
      db.guilds.set(interaction.guild.id, 'settings', settings);
      return interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '✅ تم الاعداد', '✅ Set up'), L(l, `تم تعيين ${channel} كقناة ${conf.ar}`, `Set ${channel} as the ${conf.en} channel`))] });
    }

    if (sub === 'welcome' || sub === 'leave') {
      const channel = interaction.options.getChannel('channel');
      settings[sub === 'welcome' ? 'welcomeChannel' : 'leaveChannel'] = channel.id;
      db.guilds.set(interaction.guild.id, 'settings', settings);
      return interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '✅ تم الاعداد', '✅ Set up'), L(l, `تم تعيين ${channel} كقناة ${sub === 'welcome' ? 'رسائل الترحيب' : 'رسائل الوداع'}`, `Set ${channel} as the ${sub === 'welcome' ? 'welcome message' : 'leave message'} channel`))] });
    }

    if (sub === 'autorole' || sub === 'modrole') {
      const role = interaction.options.getRole('role');
      settings[sub === 'autorole' ? 'autorole' : 'modRole'] = role.id;
      db.guilds.set(interaction.guild.id, 'settings', settings);
      return interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '✅ تم الاعداد', '✅ Set up'), L(l, `تم تعيين رول ${sub === 'autorole' ? 'الاعضاء الجدد' : 'الادارة'}: ${role}`, `Set ${sub === 'autorole' ? 'auto' : 'moderator'} role: ${role}`))] });
    }
  },
};
