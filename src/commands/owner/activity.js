const { SlashCommandBuilder, ActivityType } = require('discord.js');
const { embed } = require('../../utils/embed');
const { L } = require('../../utils/i18n');
const { db } = require('../../utils/database');

const TYPE_MAP = {
  Playing: ActivityType.Playing,
  Listening: ActivityType.Listening,
  Watching: ActivityType.Watching,
  Competing: ActivityType.Competing,
  Streaming: ActivityType.Streaming,
};

const STATUS_MAP = {
  online: 'online',
  idle: 'idle',
  dnd: 'dnd',
  invisible: 'invisible',
};

module.exports = {
  category: 'owner',
  descEn: 'Set bot activity and presence (developer only)',
  data: new SlashCommandBuilder()
    .setName('activity')
    .setDescription('تغيير نشاط البوت (مطور فقط)')
    .setDescriptionLocalizations({ 'en-US': 'Set bot activity (developer only)' })
    .addSubcommand((s) => s.setName('set').setDescription(L('x', 'تعيين النشاط', 'Set activity')).setDescriptionLocalizations({ 'en-US': 'Set activity' })
      .addStringOption((o) => o.setName('type').setDescription(L('x', 'النوع', 'Type')).setDescriptionLocalizations({ 'en-US': 'Type' }).setRequired(true).addChoices(
        { name: '▶️ ' + L('x', 'يلعب', 'Playing'), value: 'Playing' },
        { name: '🔴 ' + L('x', 'يستمع', 'Listening'), value: 'Listening' },
        { name: '📺 ' + L('x', 'يشاهد', 'Watching'), value: 'Watching' },
        { name: '🌱 ' + L('x', 'يتنافس', 'Competing'), value: 'Competing' },
        { name: '📡 ' + L('x', 'يبث', 'Streaming'), value: 'Streaming' }))
      .addStringOption((o) => o.setName('text').setDescription(L('x', 'النص', 'Text')).setDescriptionLocalizations({ 'en-US': 'Text' }).setRequired(true))
      .addStringOption((o) => o.setName('status').setDescription(L('x', 'حالة الاتصال (اختياري)', 'Presence status (optional)')).setDescriptionLocalizations({ 'en-US': 'Presence status (optional)' }).addChoices(
        { name: '🟢 ' + L('x', 'متصل', 'Online'), value: 'online' },
        { name: '🌙 ' + L('x', 'غير نشط', 'Idle'), value: 'idle' },
        { name: '⛔ ' + L('x', 'مشغول', 'Do Not Disturb'), value: 'dnd' },
        { name: '⚫ ' + L('x', 'مخفي', 'Invisible'), value: 'invisible' }))
      .addStringOption((o) => o.setName('url').setDescription(L('x', 'رابط البث (مطلوب فقط للنوع بث)', 'Stream URL (required only for Streaming)')).setDescriptionLocalizations({ 'en-US': 'Stream URL (required only for Streaming)' })))
    .addSubcommand((s) => s.setName('clear').setDescription(L('x', 'ارجاع النشاط التلقائي', 'Restore rotating status')).setDescriptionLocalizations({ 'en-US': 'Restore rotating status' }))
    .setDefaultMemberPermissions(8),
  devOnly: true,
  async run(client, interaction) {
    const l = interaction.user.id;
    const sub = interaction.options.getSubcommand();

    if (sub === 'set') {
      const type = interaction.options.getString('type');
      const text = interaction.options.getString('text');
      const status = STATUS_MAP[interaction.options.getString('status') || 'online'];
      const url = interaction.options.getString('url');

      if (type === 'Streaming' && !/^https?:\/\/www\.twitch\.tv\//i.test(url || '')) {
        return interaction.reply({ embeds: [embed(interaction.guild, { title: '❌', description: L(l, 'نوع البث يحتاج رابط تويتش صالح مثال: https://www.twitch.tv/username', 'Streaming requires a valid Twitch URL e.g. https://www.twitch.tv/username'), color: 'error' })], ephemeral: true });
      }

      const activity = { name: text, type: TYPE_MAP[type], ...(url ? { url } : {}) };
      client.customActivity = activity;
      db.bot.set('activity', { activity, status });
      await client.user.setPresence({ activities: [activity], status });
      const statusNames = { online: L(l, 'متصل', 'Online'), idle: L(l, 'غير نشط', 'Idle'), dnd: L(l, 'مشغول', 'DND'), invisible: L(l, 'مخفي', 'Invisible') };
      return interaction.reply({ embeds: [embed(interaction.guild, { title: L(l, '✅ تم', '✅ Done'), description: L(l, `تم تعيين النشاط: **${type} ${text}**\nالحالة: **${statusNames[status]}**`, `Activity set: **${type} ${text}**\nStatus: **${statusNames[status]}**`), color: 'success' })] });
    }

    if (sub === 'clear') {
      client.customActivity = null;
      db.bot.delete('activity');
      await client.user.setPresence({ activities: [{ name: '🔥 V9 BOT', type: ActivityType.Playing }], status: 'online' });
      return interaction.reply({ embeds: [embed(interaction.guild, { title: L(l, '✅ تم', '✅ Done'), description: L(l, 'تم ارجاع النشاط التلقائي', 'Rotating status restored'), color: 'success' })] });
    }
  },
};
