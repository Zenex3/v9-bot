const { embed } = require('../utils/embed');
const { sendLog, trackBulkDelete } = require('../services/logService');
const { formatNumber } = require('../utils/functions');

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

function messageEmbed(guild, msg) {
  const author = msg.author || null;
  const fields = [];
  if (msg.content) fields.push({ name: '📝 المحتوى', value: msg.content.slice(0, 1024) });
  if (msg.attachments && msg.attachments.size) {
    fields.push({ name: '🖼️ المرفقات', value: msg.attachments.map((a) => `[${a.name || 'ملف'}](${a.url})`).join('\n').slice(0, 1024) });
  }
  if (!msg.content && !msg.attachments?.size) {
    fields.push({ name: '📝 المحتوى', value: '*(رسالة بدون محتوى)*' });
  }
  return embed(guild, {
    title: '🗑️ رسالة محذوفة (جماعي)',
    description: `**الحارس:** ${author ? `${author.tag} (${author})` : 'غير معروف'}`,
    fields,
    thumbnail: author ? author.displayAvatarURL({ size: 128 }) : null,
    footer: { text: `الايدي: ${msg.id}` },
  });
}

module.exports = {
  name: 'messageDeleteBulk',
  async run(client, messages, channel) {
    if (!channel.guild) return;
    trackBulkDelete(messages.map((m) => m.id));

    const list = [...messages.values()].sort((a, b) => (a.createdTimestamp || 0) - (b.createdTimestamp || 0));
    if (!list.length) return;

    const summary = embed(channel.guild, {
      title: '🧹 حذف جماعي',
      description: `تم حذف **${formatNumber(list.length)}** رسالة في ${channel}`,
    });
    await sendLog(channel.guild, 'bulkDelete', summary);

    for (const msg of list) {
      await sendLog(channel.guild, 'bulkDelete', messageEmbed(channel.guild, msg));
      await delay(150);
    }
  },
};
