const { embed } = require('../utils/embed');
const { sendLog, getProtection } = require('../services/logService');
const { isOwner } = require('../utils/functions');
const { getExecutor } = require('../services/antiNukeService');
const logger = require('../utils/logger');

module.exports = {
  name: 'roleUpdate',
  async run(client, oldRole, newRole) {
    if (!oldRole.guild) return;

    const protection = getProtection(oldRole.guild.id);
    if (protection.roleProtect?.enabled && protection.roleProtect.roles.includes(newRole.id)) {
      const executor = await getExecutor(oldRole.guild, 30);
      if (executor && executor.id !== client.user.id && !isOwner(executor.id)) {
        try {
          await newRole.setName(oldRole.name, 'Role Protect: استعادة الاسم');
          await newRole.setColor(oldRole.hexColor, 'Role Protect: استعادة اللون');
          await newRole.setPermissions(oldRole.permissions, 'Role Protect: استعادة الصلاحيات');
          await newRole.setHoist(oldRole.hoist, 'Role Protect: استعادة التمييز');
          await newRole.setMentionable(oldRole.mentionable, 'Role Protect: استعادة الذكر');
          const alert = embed(oldRole.guild, {
            title: '🛡️ Role Protect',
            description: `تم تعديل رول محمي بواسطة **${executor.tag}** وقام البوت باستعادته`,
            color: 'warning',
          });
          await sendLog(oldRole.guild, 'protection', alert);
          logger.warn(`Role Protect: استعادة رول ${newRole.name} في ${oldRole.guild.name}`);
          return;
        } catch (e) {
          logger.warn(`Role Protect: تعذر الاستعادة في ${oldRole.guild.name}:`, e.message);
        }
      }
    }

    const fields = [];
    if (oldRole.name !== newRole.name) fields.push({ name: '📝 الاسم', value: `${oldRole.name} ➜ ${newRole.name}` });
    if (oldRole.hexColor !== newRole.hexColor) fields.push({ name: '🎨 اللون', value: `${oldRole.hexColor} ➜ ${newRole.hexColor}` });
    if (oldRole.permissions.bitfield !== newRole.permissions.bitfield) fields.push({ name: '🛡️ الصلاحيات', value: 'تم تغيير صلاحيات الرول' });
    if (oldRole.hoist !== newRole.hoist) fields.push({ name: '📌 تمييز', value: `${oldRole.hoist} ➜ ${newRole.hoist}` });
    if (!fields.length) return;

    const logEmbed = embed(oldRole.guild, {
      title: '⚙️ تعديل رول',
      description: `تم تعديل الرول ${newRole}`,
      fields,
    });
    await sendLog(oldRole.guild, 'roleUpdate', logEmbed);
  },
};
