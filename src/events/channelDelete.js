const { embed } = require('../utils/embed');
const { sendLog } = require('../services/logService');
const { isProtected, getExecutor } = require('../services/antiNukeService');
const logger = require('../utils/logger');
const serverLog = require('../services/serverLog');

module.exports = {
  name: 'channelDelete',
  async run(client, channel) {
    if (!channel.guild) return;

    const executor = await getExecutor(channel.guild, 12);
    if (executor && executor.id !== client.user.id && isProtected(channel.guild.id, executor.id)) {
      try {
        const newChannel = await channel.guild.channels.create({
          name: channel.name,
          type: channel.type,
          parent: channel.parentId,
          topic: channel.topic || null,
          nsfw: channel.nsfw || false,
          reason: 'Anti-Nuke: استعادة قناة محذوفة',
        });
        await newChannel.permissionOverwrites.set(channel.permissionOverwrites.cache).catch(() => null);
        const alert = embed(channel.guild, {
          title: '🚨 Anti-Nuke',
          description: `تم حذف قناة بواسطة **${executor.tag}** وقام البوت باستعادتها: ${newChannel}`,
          color: 'warning',
        });
        await sendLog(channel.guild, 'protection', alert);
        logger.warn(`Anti-Nuke: استعادة قناة في ${channel.guild.name}`);
        return;
      } catch (e) {
        logger.warn(`Anti-Nuke: تعذر استعادة القناة في ${channel.guild.name}:`, e.message);
      }
    }

    if (channel.type === 4) {
      serverLog.addEvent(channel.guild.id, {
        type: 'category_delete',
        name: channel.name,
        id: channel.id,
        executor: executor?.tag || null,
      });
    } else {
      serverLog.addEvent(channel.guild.id, {
        type: 'channel_delete',
        name: channel.name,
        id: channel.id,
        executor: executor?.tag || null,
      });
    }

    const logEmbed = embed(channel.guild, {
      title: '🗑️ حذف قناة',
      description: `تم حذف القناة **${channel.name}**`,
      fields: [{ name: '🆔 الآيدي', value: channel.id, inline: true }],
    });
    await sendLog(channel.guild, 'channelDelete', logEmbed);
  },
};
