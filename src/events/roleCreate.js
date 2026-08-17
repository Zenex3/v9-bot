const { embed } = require('../utils/embed');
const { sendLog } = require('../services/logService');
const serverLog = require('../services/serverLog');

module.exports = {
  name: 'roleCreate',
  async run(client, role) {
    if (!role.guild) return;
    serverLog.addEvent(role.guild.id, {
      type: 'role_create',
      name: role.name,
      id: role.id,
    });
    const logEmbed = embed(role.guild, {
      title: '🎭 انشاء رول',
      description: `تم انشاء الرول **${role}**`,
      fields: [{ name: '🆔 الآيدي', value: role.id, inline: true }],
    });
    await sendLog(role.guild, 'roleCreate', logEmbed);
  },
};
