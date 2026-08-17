const { embed } = require('../utils/embed');
const { sendLog } = require('../services/logService');

module.exports = {
  name: 'messageUpdate',
  async run(client, oldMessage, newMessage) {
    if (!oldMessage.guild || !oldMessage.author || oldMessage.author?.bot) return;
    if (oldMessage.content === newMessage.content) return;
    if (!oldMessage.content && !newMessage.content) return;

    const logEmbed = embed(oldMessage.guild, {
      title: '✏️ تعديل رسالة',
      description: `**الحارس:** ${oldMessage.author.tag} (${oldMessage.author})`,
      fields: [
        { name: '📌 المكان', value: `${oldMessage.channel}`, inline: true },
        { name: '📝 قبل', value: (oldMessage.content || 'بدون محتوى').slice(0, 1024) },
        { name: '🆕 بعد', value: (newMessage.content || 'بدون محتوى').slice(0, 1024) },
      ],
      thumbnail: oldMessage.author.displayAvatarURL({ size: 256 }),
    });
    await sendLog(oldMessage.guild, 'messageEdit', logEmbed);
  },
};
