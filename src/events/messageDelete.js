const { embed, warnEmbed } = require('../utils/embed');
const { sendLog, getProtection, isBulkDeleted } = require('../services/logService');

module.exports = {
  name: 'messageDelete',
  async run(client, message) {
    if (!message.guild || !message.author || message.author?.bot) return;
    if (isBulkDeleted(message.id)) return;

    // Ghost ping detection
    const protection = getProtection(message.guild.id);
    const content = message.content || '';
    const mentions = [...(message.mentions?.users?.values?.() || [])].filter((u) => !u.bot && u.id !== message.author.id);

    if (protection.ghostPing?.enabled && (mentions.length || content.includes('@everyone') || content.includes('@here'))) {
      const alert = warnEmbed(message.guild, '👻 قوست بنق!', [
        `**${message.author.tag}** حذف رسالة فيها منشن`,
        content ? `**الرسالة:** ${content.slice(0, 500)}` : '',
        mentions.length ? `**المنشن:** ${mentions.map((m) => m).join(' ')}` : '',
      ].filter(Boolean).join('\n'));
      await sendLog(message.guild, 'protection', alert);
    }

    const logEmbed = embed(message.guild, {
      title: '🗑️ حذف رسالة',
      description: `**الحارس:** ${message.author.tag} (${message.author})`,
      fields: [
        { name: '📌 المكان', value: `${message.channel}`, inline: true },
        { name: '🆔 الرسالة', value: message.id, inline: true },
        ...(content ? [{ name: '📝 المحتوى', value: content.slice(0, 1024) }] : []),
      ],
      thumbnail: message.author.displayAvatarURL({ size: 256 }),
      footer: { text: `الايدي: ${message.author.id}` },
    });
    await sendLog(message.guild, 'messageDelete', logEmbed);
  },
};
