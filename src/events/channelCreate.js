const { embed } = require('../utils/embed');
const { sendLog } = require('../services/logService');
const serverLog = require('../services/serverLog');

const TYPES = {
  0: '📝 نصي', 2: '🔊 صوتي', 4: '📂 كاتيجوري', 5: '📢 اعلانات', 13: '🎙️ مرحلة', 15: '🏷️ منتدى',
};

module.exports = {
  name: 'channelCreate',
  async run(client, channel) {
    if (!channel.guild) return;

    const typeNum = channel.type;
    if (typeNum === 4) {
      serverLog.addEvent(channel.guild.id, {
        type: 'category_create',
        name: channel.name,
        id: channel.id,
      });
    } else {
      serverLog.addEvent(channel.guild.id, {
        type: 'channel_create',
        name: channel.name,
        id: channel.id,
      });
    }

    const logEmbed = embed(channel.guild, {
      title: '📂 انشاء قناة',
      description: `تم انشاء قناة ${TYPES[channel.type] || 'اخرى'} **${channel.name}** (${channel})`,
      fields: [{ name: '🆔 الآيدي', value: channel.id, inline: true }],
    });
    await sendLog(channel.guild, 'channelCreate', logEmbed);
  },
};
