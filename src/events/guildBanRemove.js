const { embed } = require('../utils/embed');
const { sendLog } = require('../services/logService');

module.exports = {
  name: 'guildBanRemove',
  async run(client, ban) {
    if (!ban.guild) return;
    const logEmbed = embed(ban.guild, {
      title: '🔓 انبان',
      description: `تم فك البان عن **${ban.user.tag}** (${ban.user})`,
      thumbnail: ban.user.displayAvatarURL({ size: 256 }),
    });
    await sendLog(ban.guild, 'unban', logEmbed);
  },
};
