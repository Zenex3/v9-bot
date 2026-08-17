const { ActivityType } = require('discord.js');
const config = require('../../config.json');
const logger = require('../utils/logger');
const { embed, successEmbed } = require('../utils/embed');
const { db } = require('../utils/database');

let statusIndex = 0;

const statuses = [
  { name: '🔥 V9 BOT', type: ActivityType.Playing },
  { name: 'الاوامر في /help', type: ActivityType.Playing },
];

module.exports = {
  name: 'clientReady',
  once: true,
  async run(client) {
    logger.success(`تم تسجيل الدخول كـ ${client.user.tag}`);

    setTimeout(async () => {
      for (const ownerId of config.owners || []) {
        try {
          const owner = client.users.cache.get(ownerId) || (await client.users.fetch(ownerId).catch(() => null));
          if (owner) {
            const msg = await owner.send('✅ **V9 Bot شغال** — لو شايف الرسالة دي يبقى الخاص شغال.\nجرب ترجعلي رسالة هنا وشوف هيرد ولا لأ.').catch(() => null);
            if (msg?.channel) {
              logger.info(`DM_CHANNEL_ID=${msg.channel.id}`);
            } else {
              logger.warn('تعذر ارسال رسالة الخاص للمالك');
            }
          }
        } catch {}
      }
    }, 4000);

    const blacklist = db.bot.ensure('blacklist', { user: [], guild: [] });
    for (const guild of client.guilds.cache.values()) {
      if (blacklist.guild.some((b) => b.id === guild.id)) {
        logger.warn(`غادرت سيرفر محظور: ${guild.name} (${guild.id})`);
        guild.leave().catch(() => null);
      }
    }

    const saved = db.bot.get('activity');
    if (saved?.activity) {
      client.customActivity = saved.activity;
      client.user.setPresence({ activities: [saved.activity], status: saved.status || 'online' });
      logger.info(`تم استرجاع النشاط المحفوظ: ${saved.activity.name}`);
    } else {
      client.customActivity = null;
    }

    require('../services/scheduler').init(client);

    const shopService = require('../services/shopService');
    shopService.checkExpiredSubscriptions(client);
    setInterval(() => shopService.checkExpiredSubscriptions(client), 60_000);

    const tempVoice = require('../services/tempVoiceService');
    setTimeout(() => tempVoice.cleanupOrphans(client).catch(() => {}), 5000);

    const inviteTracker = require('../services/inviteTracker');
    setTimeout(async () => {
      let count = 0;
      for (const guild of client.guilds.cache.values()) {
        await inviteTracker.initGuild(guild);
        count++;
      }
      logger.info(`[INVITE] تم تهيئة انفايتات ${count} سيرفر`);
    }, 6000);

    client.on('raw', (d) => {
      if (d.t === 'INVITE_CREATE') {
        const data = d.d;
        if (!data.guild_id) return;
        inviteTracker.cacheCreate(data.guild_id, {
          code: data.code,
          inviterId: data.inviter?.id,
          uses: data.uses || 0,
          maxAge: data.max_age,
          maxUses: data.max_uses,
        });
      }
      if (d.t === 'INVITE_DELETE') {
        const data = d.d;
        if (!data.guild_id) return;
        const existing = inviteTracker.getInviteData(data.guild_id, data.code);
        if (existing && data.uses === 0) {
          inviteTracker.markOrphan(data.guild_id, data.code);
        }
        inviteTracker.cacheDelete(data.guild_id, data.code);
      }
    });

    const commandSync = require('../services/commandSync');
    setTimeout(async () => {
      try {
        const results = await commandSync.sync();
        logger.info(`[SYNC] ${results.join(' | ')}`);
      } catch (e) {
        logger.error('[SYNC] تعذرت مزامنة الاوامر:', e.message);
      }
    }, 3000);

    setInterval(() => {
      if (client.customActivity) return;
      const s = statuses[statusIndex % statuses.length];
      client.user.setActivity(s.name, { type: s.type });
      statusIndex++;
    }, 10000);

    const guildCount = client.guilds.cache.size;
    logger.info(`يعمل في ${guildCount} سيرفر و ${client.commands.size} امر`);

    const restartUser = process.env.RESTART_USER;
    const restartChannel = process.env.RESTART_CHANNEL;
    const restartGuild = process.env.RESTART_GUILD;
    if (restartUser) {
      delete process.env.RESTART_USER;
      delete process.env.RESTART_CHANNEL;
      delete process.env.RESTART_GUILD;
      setTimeout(async () => {
        const msg = successEmbed(null, '✅ تم اعادة تشغيل البوت بنجاح', `البوت **${client.user.tag}** شغال الان بالكامل 🎉\n\n**السيرفرات:** ${client.guilds.cache.size}\n**الاوامر:** ${client.commands.size}\n**البنج:** ${Math.round(client.ws.ping)}ms`);
        const guild = client.guilds.cache.get(restartGuild);
        const channel = guild?.channels.cache.get(restartChannel);
        if (channel?.isTextBased()) {
          await channel.send({ embeds: [msg] }).catch(() => {});
        } else {
          const user = client.users.cache.get(restartUser) || await client.users.fetch(restartUser).catch(() => null);
          await user?.send({ embeds: [msg] }).catch(() => {});
        }
      }, 3000);
    }
  },
};
