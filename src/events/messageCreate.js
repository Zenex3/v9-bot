const { warnEmbed, embed, successEmbed } = require('../utils/embed');
const { getSettings, getProtection, sendLog, sendModLog } = require('../services/logService');
const { db, memberKey, getMember, userKey } = require('../utils/database');
const { relative } = require('../utils/functions');
const { t } = require('../utils/i18n');
const logger = require('../utils/logger');

const spamTracker = new Map();

const INVITE_REGEX = /(?:discord\.(?:gg|com\/invite|app\/invite)|dsc\.gg|invite\.gg|discord\.me)\/\S+/gi;
const LINK_REGEX = /https?:\/\/\S+/gi;

function hasMod(member) {
  return member.permissions?.has('ManageMessages') || member.permissions?.has('Administrator') || member.permissions?.has('ModerateMembers');
}

function cleanTracker(map, key, window) {
  const now = Date.now();
  const arr = (map.get(key) || []).filter((t) => now - t < window);
  map.set(key, arr);
  return arr;
}

async function punish(member, punishment, reason) {
  const dm = (description) => member.send({
    embeds: [warnEmbed(member.guild, '🚫 عقوبة تلقائية', description)],
  }).catch(() => {});
  try {
    if (punishment === 'mute') {
      await member.timeout(10 * 60 * 1000, reason);
      await dm(`**${member.guild.name}**\n**السبب:** ${reason}\n**المدة:** 10 دقائق`);
    } else if (punishment === 'kick') {
      await dm(`**${member.guild.name}**\n**السبب:** ${reason}`);
      await member.kick(reason);
    } else if (punishment === 'ban') {
      await dm(`**${member.guild.name}**\n**السبب:** ${reason}`);
      await member.ban({ reason });
    } else if (punishment === 'warn') {
      const data = getMember(member.guild.id, member.id);
      const warns = Array.isArray(data.warns) ? data.warns : [];
      warns.push({ reason, mod: 'AutoMod', date: Date.now() });
      data.warns = warns;
      db.members.set(memberKey(member.guild.id, member.id), data);
      await dm(`**${member.guild.name}**\n**السبب:** ${reason}\n**عدد تحذيراتك:** ${warns.length}`);
    }
  } catch (e) {
    logger.warn(`فشلت العقوبة ${punishment} على ${member.user.tag}:`, e.message);
  }
}

module.exports = {
  name: 'messageCreate',
  async run(client, message) {
    if (!message.guild) {
      logger.info(`[DM] رسالة من ${message.author?.tag} (${message.author?.id}): "${(message.content || '').slice(0, 50)}"`);
      return require('../services/shopService').handleDM(client, message);
    }
    if (!message.channel || !message.channel.isTextBased()) return;

    // ============ Auto-Reaction ============
    if (!message.author.bot) {
      const autoreact = db.guilds.ensure(message.guild.id, 'autoreact', {});
      const reacts = autoreact[message.channel.id];
      if (Array.isArray(reacts) && reacts.length) {
        for (const emoji of reacts.slice(0, 5)) {
          message.react(emoji).catch(() => {});
        }
      }
    }

    if (message.author.bot) return;

    // ============ وضع الافك (AFK) ============
    const authorData = db.users.get(userKey(message.author.id));
    if (authorData?.afk) {
      delete authorData.afk;
      db.users.set(userKey(message.author.id), authorData);
      await message.reply({
        embeds: [successEmbed(message.guild, t(message.author.id, 'afk_removed'), t(message.author.id, 'afk_welcome_back'))],
      }).catch(() => {});
    }

    // رد تلقائي عند منشن شخص في وضع الافك
    const afkMentioned = [...(message.mentions?.users?.values?.() || [])]
      .find((u) => !u.bot && u.id !== message.author.id && db.users.get(userKey(u.id))?.afk);
    if (afkMentioned && message.content) {
      const afk = db.users.get(userKey(afkMentioned.id)).afk;
      const member = message.guild.members.cache.get(afkMentioned.id);
      const where = member?.voice?.channel || message.guild.channels.cache.get(afk.channelId);
      const whereLine = where ? `\n📍 ${t(message.author.id, 'afk_mention_goto')}: ${where}` : '';
      await message.reply({
        embeds: [embed(message.guild, {
          title: t(message.author.id, 'afk_mention_title'),
          description: [
            `**${member?.displayName || afkMentioned.username}** ${t(message.author.id, 'afk_mention_is')}`,
            `**${t(message.author.id, 'afk_mention_reason')}:** ${afk.reason || t(message.author.id, 'afk_no_reason')}`,
            `**${t(message.author.id, 'afk_mention_since')}:** ${relative(afk.since)}`,
            whereLine,
          ].filter(Boolean).join('\n'),
          color: 'info',
          thumbnail: afkMentioned.displayAvatarURL({ size: 128 }),
        })],
      }).catch(() => {});
    }

    // ============ نظام الاقتراحات ============
    const suggestCfg = db.guilds.ensure(message.guild.id, 'suggest', { enabled: false, channel: null });
    if (suggestCfg.enabled && suggestCfg.channel === message.channel.id) {
      const content = message.content || '';
      const attachment = message.attachments?.first()?.url;
      if (content.trim() || attachment) {
        try { await message.delete(); } catch {}
        const { postSuggestion } = require('../services/suggestionService');
        const res = await postSuggestion(message.guild, message.author, content, attachment);
        if (res.error === 'send_failed') {
          await message.channel.send({ embeds: [warnEmbed(message.guild, '⚠️', t(message.author.id, 'sug_send_failed'))] }).catch(() => {});
        }
      }
      return;
    }

    const settings = getSettings(message.guild.id);
    const protection = getProtection(message.guild.id);

    // ============ Auto-Mod ============
    if (hasMod(message.member)) return;

    const content = message.content || '';
    const lower = content.toLowerCase();
    const now = Date.now();

    // Anti-spam
    if (protection.antiSpam?.enabled) {
      const spam = protection.antiSpam;
      const key = `${message.author.id}.${message.guild.id}`;
      const arr = cleanTracker(spamTracker, key, spam.window || 5000);
      arr.push(now);
      if (arr.length > (spam.limit || 6)) {
        try { await message.delete(); } catch {}
        await punish(message.member, spam.punishment || 'mute', 'Spam زائد');
        const log = warnEmbed(message.guild, '🚫 سبام', `**${message.author.tag}** تم معاقبته بسبب السبام`);
        await sendLog(message.guild, 'protection', log);
        return;
      }
    }

    // Mention spam
    if (content) {
      const mentionCount = (message.mentions.users.size + (message.mentions.roles.size * 2) + (content.includes('@everyone') ? 5 : 0) + (content.includes('@here') ? 5 : 0));
      if (mentionCount > (protection.maxMentions || 5)) {
        try { await message.delete(); } catch {}
        await message.member.timeout(5 * 60 * 1000, 'Mention Spam').catch(() => {});
        const log = warnEmbed(message.guild, '🚫 مينشن زائد', `**${message.author.tag}** عمل مينشن ${mentionCount}`);
        await sendLog(message.guild, 'protection', log);
        return;
      }
    }

    // Anti-invite
    if (protection.antiInvite?.enabled && INVITE_REGEX.test(content)) {
      try { await message.delete(); } catch {}
      await punish(message.member, 'warn', 'ارسال دعوات سيرفرات');
      const log = warnEmbed(message.guild, '🚫 انفايت ممنوع', `**${message.author.tag}** ارسل دعوة سيرفر\n**${truncate(content, 200)}**`);
      await sendModLog(message.guild, log);
      return;
    }

    // Anti-link
    if (protection.antiLink?.enabled && LINK_REGEX.test(content)) {
      try { await message.delete(); } catch {}
      await punish(message.member, 'warn', 'ارسال روابط');
      const log = warnEmbed(message.guild, '🚫 الروابط ممنوعة', `**${message.author.tag}** ارسل رابط\n**${truncate(content, 200)}**`);
      await sendModLog(message.guild, log);
      return;
    }

    // Bad words
    if (protection.badWords?.enabled && protection.badWords.list.length && content) {
      const entry = protection.badWords.list.find((w) => w && w.word && matchesBadWord(lower, w.word));
      if (entry) {
        try { await message.delete(); } catch {}

        const action = entry.punishment || 'warn';
        await punish(message.member, action, `كلمة ممنوعة: ${entry.word}`);

        const actionAr = { warn: 'تحذير', mute: 'اخمات 10 دقائق', kick: 'طرد من السيرفر', ban: 'حظر من السيرفر' }[action] || action;

        try {
          await message.member.send({
            embeds: [warnEmbed(message.guild, '🚫 كلمة ممنوعة', `استخدمت كلمة ممنوعة **${entry.word}** في **${message.guild.name}**\n**العقوبة:** ${actionAr}`)],
          });
        } catch {}

        const log = warnEmbed(message.guild, '🚫 كلمة ممنوعة', `**${message.author.tag}** استخدم كلمة ممنوعة: **${entry.word}**\n**العقوبة:** ${actionAr}`);
        await sendLog(message.guild, 'protection', log);
        return;
      }
    }
  },
};

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function matchesBadWord(lower, word) {
  const w = String(word || '').toLowerCase();
  if (!w) return false;
  if (/^[\x00-\x7F]+$/.test(w)) {
    return new RegExp(`(^|[^a-z0-9])${escapeRegExp(w)}([^a-z0-9]|$)`).test(lower);
  }
  return lower.includes(w);
}

function truncate(t, n) {
  t = String(t);
  return t.length > n ? t.slice(0, n - 1) + '…' : t;
}
