const { embed } = require('../utils/embed');
const logger = require('../utils/logger');
const { formatNumber } = require('../utils/functions');
const { db } = require('../utils/database');

module.exports = {
  name: 'guildCreate',
  async run(client, guild) {
    const blacklist = db.bot.ensure('blacklist', { user: [], guild: [] });
    if (blacklist.guild.some((b) => b.id === guild.id)) {
      logger.warn(`سيرفر محظور حاول اضافة البوت: ${guild.name} (${guild.id}) — غادرته`);
      await guild.leave().catch(() => null);
      return;
    }

    logger.success(`انضممت الى سيرفر: ${guild.name} (${formatNumber(guild.memberCount)} عضو)`);
    const channel = guild.systemChannel || guild.channels.cache.find((c) => c.isTextBased());
    if (!channel) return;
    const welcome = embed(guild, {
      title: '🔥 شكرا لاضافتي!',
      description: [
        `اهلا بكم في **${guild.name}**`,
        'انا بوت **V9 Bot** بنظام احترافي كامل',
        '',
        '✨ **الامكانيات:**',
        '🛡️ حماية (سبام، لينك، بان كلمات، ريد، قوست بنق، نيوك، توثيق)',
        '📝 لوج شامل لكل الاحداث',
        '👋 ترحيب و وداع تلقائي',
        '📊 مستويات ونقاط خبرة',
        '🛠️ اوامر ادمن كاملة',
        '👑 تحكم كامل للمالك',
        '',
        'ابدأ بكتابة **/help** و **/setup**',
      ].join('\n'),
    });
    try {
      await channel.send({ embeds: [welcome] });
    } catch {}
  },
};
