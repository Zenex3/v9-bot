const { embed } = require('../utils/embed');
const { sendLog } = require('../services/logService');
const { isProtected, getExecutor } = require('../services/antiNukeService');
const logger = require('../utils/logger');

module.exports = {
  name: 'guildBanAdd',
  async run(client, ban) {
    if (!ban.guild) return;

    const executor = await getExecutor(ban.guild, 22);
    if (executor && isProtected(ban.guild.id, executor.id)) {
      try {
        await ban.guild.bans.remove(ban.user.id, 'Anti-Nuke: فك الحظر');
        const alert = embed(ban.guild, {
          title: '🚨 Anti-Nuke',
          description: `تم بان **${ban.user.tag}** بواسطة **${executor.tag}** وقام البوت بفك الحظر`,
          color: 'warning',
        });
        await sendLog(ban.guild, 'protection', alert);
        logger.warn(`Anti-Nuke: فك بان في ${ban.guild.name}`);
        return;
      } catch (e) {
        logger.warn(`Anti-Nuke: تعذر فك البان في ${ban.guild.name}:`, e.message);
      }
    }

    const logEmbed = embed(ban.guild, {
      title: '🔨 بان',
      description: `تم بان **${ban.user.tag}** (${ban.user})`,
      fields: [
        { name: '🆔 الآيدي', value: ban.user.id, inline: true },
        { name: '📄 السبب', value: ban.reason || 'غير محدد', inline: true },
      ],
      thumbnail: ban.user.displayAvatarURL({ size: 256 }),
    });
    await sendLog(ban.guild, 'ban', logEmbed);
  },
};
