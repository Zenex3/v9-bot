const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { embed, errorEmbed, successEmbed } = require('../../utils/embed');
const { L } = require('../../utils/i18n');
const { formatTime, formatDate, relative } = require('../../utils/functions');
const scheduler = require('../../services/scheduler');

function isImageURL(url) {
  return /^https?:\/\/\S+\.(png|jpe?g|gif|webp|bmp)(\?\S*)?$/i.test(url);
}

const COLOR_NAMES = ['red', 'darkRed', 'green', 'orange', 'blue', 'purple', 'pink', 'yellow', 'cyan', 'white', 'black', 'success', 'error', 'warning', 'info'];

function resolveColor(input) {
  if (!input) return 'info';
  const name = input.toLowerCase();
  if (COLOR_NAMES.some((c) => c.toLowerCase() === name)) return input;
  const hex = input.replace(/^#/, '');
  if (/^[0-9a-fA-F]{6}$/.test(hex)) return `#${hex}`;
  return null;
}

module.exports = {
  category: 'config',
  descEn: 'Schedule messages to be sent later',
  data: new SlashCommandBuilder()
    .setName('schedule')
    .setDescription('جدولة رسائل ترسل في وقت معين')
    .setDescriptionLocalizations({ 'en-US': 'Schedule messages to be sent later' })
    .setDefaultMemberPermissions(8)
    .addSubcommand((s) => s.setName('add').setDescription(L('x', 'جدولة رسالة جديدة', 'Schedule a new message')).setDescriptionLocalizations({ 'en-US': 'Schedule a new message' })
      .addChannelOption((o) => o.setName('channel').setDescription(L('x', 'الروم الذي سترسل فيه الرسالة', 'Channel to send the message in')).setDescriptionLocalizations({ 'en-US': 'Channel to send the message in' }).addChannelTypes(ChannelType.GuildText).setRequired(true))
      .addStringOption((o) => o.setName('message').setDescription(L('x', 'نص الرسالة', 'Message text')).setDescriptionLocalizations({ 'en-US': 'Message text' }))
      .addStringOption((o) => o.setName('after').setDescription(L('x', 'بعد مدة مثال: 30m, 2h, 1d', 'After a duration e.g. 30m, 2h, 1d')).setDescriptionLocalizations({ 'en-US': 'After a duration e.g. 30m, 2h, 1d' }))
      .addStringOption((o) => o.setName('time').setDescription(L('x', 'في وقت محدد مثال: 2026-08-09 18:30', 'At a specific time e.g. 2026-08-09 18:30')).setDescriptionLocalizations({ 'en-US': 'At a specific time e.g. 2026-08-09 18:30' }))
      .addStringOption((o) => o.setName('repeat').setDescription(L('x', 'تكرار كل مدة مثال: 1d, 12h (اختياري)', 'Repeat every duration e.g. 1d, 12h (optional)')).setDescriptionLocalizations({ 'en-US': 'Repeat every duration e.g. 1d, 12h (optional)' }))
      .addStringOption((o) => o.setName('title').setDescription(L('x', 'عنوان الايمبد (اختياري)', 'Embed title (optional)')).setDescriptionLocalizations({ 'en-US': 'Embed title (optional)' }))
      .addStringOption((o) => o.setName('description').setDescription(L('x', 'وصف الايمبد (اختياري)', 'Embed description (optional)')).setDescriptionLocalizations({ 'en-US': 'Embed description (optional)' }))
      .addStringOption((o) => o.setName('color').setDescription(L('x', 'لون الايمبد مثال: green أو #ff0000 (اختياري)', 'Embed color e.g. green or #ff0000 (optional)')).setDescriptionLocalizations({ 'en-US': 'Embed color e.g. green or #ff0000 (optional)' }))
      .addStringOption((o) => o.setName('image').setDescription(L('x', 'صورة الايمبد (اختياري)', 'Embed image (optional)')).setDescriptionLocalizations({ 'en-US': 'Embed image (optional)' })))
    .addSubcommand((s) => s.setName('list').setDescription(L('x', 'عرض الرسائل المجدولة', 'List scheduled messages')).setDescriptionLocalizations({ 'en-US': 'List scheduled messages' }))
    .addSubcommand((s) => s.setName('remove').setDescription(L('x', 'حذف رسالة مجدولة', 'Remove a scheduled message')).setDescriptionLocalizations({ 'en-US': 'Remove a scheduled message' }).addStringOption((o) => o.setName('id').setDescription(L('x', 'رقم الرسالة (من القائمة)', 'Message ID (from the list)')).setDescriptionLocalizations({ 'en-US': 'Message ID (from the list)' }).setRequired(true)))
    .addSubcommand((s) => s.setName('clear').setDescription(L('x', 'حذف كل الرسائل المجدولة', 'Clear all scheduled messages')).setDescriptionLocalizations({ 'en-US': 'Clear all scheduled messages' })),
  botPermissions: [PermissionFlagsBits.ViewChannel],
  async run(client, interaction) {
    const l = interaction.user.id;
    const sub = interaction.options.getSubcommand();

    if (sub === 'add') {
      const channel = interaction.options.getChannel('channel');
      const message = interaction.options.getString('message');
      const after = interaction.options.getString('after');
      const time = interaction.options.getString('time');
      const repeat = interaction.options.getString('repeat');
      const title = interaction.options.getString('title');
      const description = interaction.options.getString('description');
      const color = interaction.options.getString('color');
      const image = interaction.options.getString('image');

      if (!message && !title && !description) {
        return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'اكتب نص الرسالة أو عنوان/وصف الايمبد', 'Provide message text or an embed title/description'))], ephemeral: true });
      }
      if (!after && !time) {
        return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'حدد وقت الارسال: `after` (بعد مدة) أو `time` (وقت محدد)', 'Set when: `after` (duration) or `time` (specific time)'))], ephemeral: true });
      }
      if (after && time) {
        return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'اختر واحد فقط: `after` أو `time`', 'Choose only one: `after` or `time`'))], ephemeral: true });
      }

      const at = scheduler.parseScheduleTime(time || after);
      if (!at) {
        return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'وقت غير صالح — مثال: بعد `2h` أو وقت `2026-08-09 18:30`', 'Invalid time — e.g. after `2h` or time `2026-08-09 18:30`'))], ephemeral: true });
      }
      if (at <= Date.now()) {
        return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'الوقت في الماضي — اختر وقتاً في المستقبل', 'That time is in the past — pick a future time'))], ephemeral: true });
      }

      let interval = null;
      if (repeat) {
        interval = scheduler.parseScheduleTime(repeat) - Date.now();
        if (!interval || interval <= 0) {
          return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'مدة التكرار غير صالحة — مثال: 12h, 1d', 'Invalid repeat duration — e.g. 12h, 1d'))], ephemeral: true });
        }
      }

      let embedColor = null;
      if (color) {
        embedColor = resolveColor(color);
        if (!embedColor) {
          return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'لون غير صالح — مثال: green أو #ff0000', 'Invalid color — e.g. green or #ff0000'))], ephemeral: true });
        }
      }
      if (image && !isImageURL(image)) {
        return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'رابط الصورة غير صالح', 'Invalid image URL'))], ephemeral: true });
      }

      const embedData = title || description || image ? { title: title || undefined, description: description || undefined, color: embedColor || undefined, image: image || undefined } : null;
      const item = scheduler.addSchedule(client, interaction.guild.id, {
        channelId: channel.id,
        content: message || null,
        embed: embedData,
        at,
        interval,
        author: interaction.user.id,
      });

      const parts = [L(l, `📅 سيتم ارسال الرسالة في ${channel} ${relative(at)}`, `📅 The message will be sent in ${channel} ${relative(at)}`)];
      if (interval) parts.push(L(l, `🔁 تتكرر كل ${formatTime(interval)}`, `🔁 Repeats every ${formatTime(interval)}`));
      if (embedData) parts.push(L(l, '🖼️ كنوع ايمبد', '🖼️ As an embed'));
      parts.push(L(l, `🆔 معرف الرسالة: \`${item.id}\``, `🆔 Message ID: \`${item.id}\``));
      return interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '⏰ تمت الجدولة', '⏰ Scheduled'), parts.join('\n'))] });
    }

    if (sub === 'list') {
      const list = scheduler.listSchedules(interaction.guild.id);
      if (!list.length) {
        return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'لا توجد رسائل مجدولة', 'No scheduled messages'))], ephemeral: true });
      }
      const lines = list.slice(0, 15).map((item, i) => {
        const ch = interaction.guild.channels.cache.get(item.channelId);
        const preview = item.content ? `"${item.content.slice(0, 40)}"` : (item.embed?.title ? `*${item.embed.title.slice(0, 40)}*` : 'ايمبد');
        const rep = item.interval ? ` 🔁${formatTime(item.interval)}` : '';
        return `\`${item.id}\` — ${ch || 'روم محذوف'} — ${relative(item.at)}${rep} — ${preview}`;
      });
      const more = list.length > 15 ? `\n...و ${list.length - 15} اخرى` : '';
      return interaction.reply({ embeds: [embed(interaction.guild, { title: L(l, `⏰ الرسائل المجدولة (${list.length})`, `⏰ Scheduled messages (${list.length})`), description: lines.join('\n') + more })] });
    }

    if (sub === 'remove') {
      const id = interaction.options.getString('id');
      const removed = scheduler.removeSchedule(client, interaction.guild.id, id);
      if (!removed) {
        return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'لم يتم العثور على رسالة بهذا المعرف', 'No message found with that ID'))], ephemeral: true });
      }
      return interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '✅ تم الحذف', '✅ Removed'), L(l, `تم حذف الرسالة المجدولة \`${id}\``, `Scheduled message \`${id}\` removed`))] });
    }

    if (sub === 'clear') {
      const count = scheduler.clearSchedules(client, interaction.guild.id);
      return interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '✅ تم الحذف', '✅ Removed'), L(l, `تم حذف **${count}** رسالة مجدولة`, `Removed **${count}** scheduled messages`))] });
    }
  },
};
