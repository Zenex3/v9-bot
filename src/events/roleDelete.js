const { embed } = require('../utils/embed');
const { sendLog, getProtection } = require('../services/logService');
const { isOwner } = require('../utils/functions');
const { getExecutor, isProtected } = require('../services/antiNukeService');
const logger = require('../utils/logger');
const serverLog = require('../services/serverLog');

module.exports = {
  name: 'roleDelete',
  async run(client, role) {
    if (!role.guild) return;

    const protection = getProtection(role.guild.id);
    const executor = await getExecutor(role.guild, 32);

    if (protection.roleProtect?.enabled && protection.roleProtect.roles.includes(role.id)) {
      if (executor && executor.id !== client.user.id && !isOwner(executor.id)) {
        try {
          const newRole = await role.guild.roles.create({
            name: role.name,
            permissions: role.permissions,
            color: role.color,
            hoist: role.hoist,
            mentionable: role.mentionable,
            reason: 'Role Protect: استعادة رول محمي',
          });
          const alert = embed(role.guild, {
            title: '🛡️ Role Protect',
            description: `تم حذف رول محمي بواسطة **${executor.tag}** وقام البوت باستعادته: <@&${newRole.id}>`,
            color: 'warning',
          });
          await sendLog(role.guild, 'protection', alert);
          logger.warn(`Role Protect: استعادة رول محمي في ${role.guild.name}`);
          return;
        } catch (e) {
          logger.warn(`Role Protect: تعذر الاستعادة في ${role.guild.name}:`, e.message);
        }
      }
    }

    if (executor && isProtected(role.guild.id, executor.id)) {
      try {
        const newRole = await role.guild.roles.create({
          name: role.name,
          permissions: role.permissions,
          color: role.color,
          hoist: role.hoist,
          mentionable: role.mentionable,
          reason: 'Anti-Nuke: استعادة رول محذوف',
        });
        const alert = embed(role.guild, {
          title: '🚨 Anti-Nuke',
          description: `تم حذف رول بواسطة **${executor.tag}** وقام البوت باستعادته: <@&${newRole.id}>`,
          color: 'warning',
        });
        await sendLog(role.guild, 'protection', alert);
        logger.warn(`Anti-Nuke: استعادة رول في ${role.guild.name}`);
        return;
      } catch (e) {
        logger.warn(`Anti-Nuke: تعذر استعادة الرول في ${role.guild.name}:`, e.message);
      }
    }

    serverLog.addEvent(role.guild.id, {
      type: 'role_delete',
      name: role.name,
      id: role.id,
      executor: executor?.tag || null,
    });

    const logEmbed = embed(role.guild, {
      title: '🗑️ حذف رول',
      description: `تم حذف الرول **${role.name}**`,
      fields: [{ name: '🆔 الآيدي', value: role.id, inline: true }],
    });
    await sendLog(role.guild, 'roleDelete', logEmbed);
  },
};
