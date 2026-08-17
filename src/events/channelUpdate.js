const { embed } = require('../utils/embed');
const { sendLog } = require('../services/logService');

function diff(oldV, newV) {
  if (oldV === newV) return null;
  return `${oldV || 'بدون'} ➜ ${newV || 'بدون'}`;
}

module.exports = {
  name: 'channelUpdate',
  async run(client, oldChannel, newChannel) {
    if (!oldChannel.guild) return;
    const fields = [];
    const name = diff(oldChannel.name, newChannel.name);
    const topic = diff(oldChannel.topic, newChannel.topic);
    const slow = diff(oldChannel.rateLimitPerUser, newChannel.rateLimitPerUser);
    const nsfw = diff(oldChannel.nsfw, newChannel.nsfw);

    if (name) fields.push({ name: '📝 الاسم', value: name });
    if (topic) fields.push({ name: '📄 الوصف', value: topic.slice(0, 1024) });
    if (slow !== null) fields.push({ name: '🐌 الوضع البطيء', value: String(slow) });
    if (nsfw !== null) fields.push({ name: '🔞 NSFW', value: String(nsfw) });

    if (!fields.length) return;

    const logEmbed = embed(oldChannel.guild, {
      title: '⚙️ تعديل قناة',
      description: `تم تعديل القناة ${newChannel}`,
      fields,
    });
    await sendLog(oldChannel.guild, 'channelUpdate', logEmbed);
  },
};
