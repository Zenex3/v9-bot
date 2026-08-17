const { embed } = require('../utils/embed');
const { sendLog, getProtection } = require('../services/logService');
const { isOwner } = require('../utils/functions');
const { getExecutor } = require('../services/antiNukeService');
const logger = require('../utils/logger');

module.exports = {
  name: 'webhookUpdate',
  async run(client, channel) {
    if (!channel.guild) return;
    const protection = getProtection(channel.guild.id);
    if (!protection.antiWebhook?.enabled) return;

    const executor = await getExecutor(channel.guild, 51);
    if (executor && isOwner(executor.id)) return;
    if (executor && executor.id === client.user.id) return;

    try {
      const webhooks = await channel.fetchWebhooks();
      const count = webhooks.size;
      for (const wh of webhooks.values()) {
        await wh.delete('Anti-Webhook');
      }
      const alert = embed(channel.guild, {
        title: '🔗 Anti-Webhook',
        description: `تم حذف ${count} ويب هوك في ${channel}${executor ? ` — بواسطة **${executor.tag}**` : ''}`,
        color: 'warning',
      });
      await sendLog(channel.guild, 'webhookUpdate', alert);
      logger.warn(`Anti-Webhook: حذف ويب هوك في ${channel.guild.name}`);
    } catch (e) {
      logger.warn(`Anti-Webhook: تعذر في ${channel.guild.name}:`, e.message);
    }
  },
};
