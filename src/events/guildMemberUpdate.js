const { embed } = require('../utils/embed');
const { sendLog } = require('../services/logService');

module.exports = {
  name: 'guildMemberUpdate',
  async run(client, oldMember, newMember) {
    if (oldMember.user.bot) return;
    if (oldMember.user.id === client.user.id) return;

    if (oldMember.nickname !== newMember.nickname) {
      const logEmbed = embed(newMember.guild, {
        title: '📛 تغيير الاسم',
        description: `**${newMember.user.tag}** (${newMember.user})`,
        fields: [
          { name: 'قبل', value: oldMember.nickname || 'لا يوجد', inline: true },
          { name: 'بعد', value: newMember.nickname || 'لا يوجد', inline: true },
        ],
        thumbnail: newMember.user.displayAvatarURL({ size: 256 }),
      });
      await sendLog(newMember.guild, 'nicknameChange', logEmbed);
    }

    const added = newMember.roles.cache.filter((r) => !oldMember.roles.cache.has(r.id));
    const removed = oldMember.roles.cache.filter((r) => !newMember.roles.cache.has(r.id));

    if (added.size || removed.size) {
      const fields = [];
      if (added.size) fields.push({ name: '➕ رول مضاف', value: added.map((r) => r.toString()).join(', '), inline: false });
      if (removed.size) fields.push({ name: '➖ رول محذوف', value: removed.map((r) => r.toString()).join(', '), inline: false });
      const logEmbed = embed(newMember.guild, {
        title: '🎭 تغيير الادوار',
        description: `**${newMember.user.tag}** (${newMember.user})`,
        fields,
        thumbnail: newMember.user.displayAvatarURL({ size: 256 }),
      });
      await sendLog(newMember.guild, 'roleChange', logEmbed);
    }
  },
};
