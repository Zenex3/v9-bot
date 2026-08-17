const { db } = require('../utils/database');
const logger = require('../utils/logger');

const LOG_TYPES = {
  join: 'joinLog',
  leave: 'leaveLog',
  kick: 'kickLog',
  ban: 'banLog',
  unban: 'unbanLog',
  roleChange: 'roleChangeLog',
  nicknameChange: 'nicknameChangeLog',
  messageEdit: 'messageEditLog',
  messageDelete: 'messageDeleteLog',
  bulkDelete: 'bulkDeleteLog',
  channelCreate: 'channelCreateLog',
  channelDelete: 'channelDeleteLog',
  channelUpdate: 'channelUpdateLog',
  roleCreate: 'roleCreateLog',
  roleDelete: 'roleDeleteLog',
  roleUpdate: 'roleUpdateLog',
  voice: 'voiceLog',
  webhookUpdate: 'webhookUpdateLog',
  mod: 'modLog',
  protection: 'protectionLog',
  ticket: 'ticketLog',
};

const LOG_TYPE_LABELS = {
  join: { ar: 'دخول الاعضاء', en: 'Member join' },
  leave: { ar: 'خروج الاعضاء', en: 'Member leave' },
  kick: { ar: 'كيك', en: 'Kick' },
  ban: { ar: 'بان', en: 'Ban' },
  unban: { ar: 'فك بان', en: 'Unban' },
  roleChange: { ar: 'تغيير رولات العضو', en: 'Member roles change' },
  nicknameChange: { ar: 'تغيير اسم العضو', en: 'Nickname change' },
  messageEdit: { ar: 'تعديل رسالة', en: 'Message edit' },
  messageDelete: { ar: 'حذف رسالة', en: 'Message delete' },
  bulkDelete: { ar: 'حذف جماعي للرسائل', en: 'Bulk message delete' },
  channelCreate: { ar: 'صنع قناة', en: 'Channel create' },
  channelDelete: { ar: 'حذف قناة', en: 'Channel delete' },
  channelUpdate: { ar: 'تعديل قناة', en: 'Channel update' },
  roleCreate: { ar: 'صنع رول', en: 'Role create' },
  roleDelete: { ar: 'حذف رول', en: 'Role delete' },
  roleUpdate: { ar: 'تعديل رول', en: 'Role update' },
  voice: { ar: 'دخول/خروج صوتي', en: 'Voice join/leave' },
  webhookUpdate: { ar: 'تغيير ويب هوك', en: 'Webhook update' },
  mod: { ar: 'اوامر الادارة (تحذير/اخمات/بان...)', en: 'Moderation commands' },
  protection: { ar: 'ردود الحماية (سبام/كلمات/نيوك...)', en: 'Protection reactions' },
  ticket: { ar: 'نظام التذاكر', en: 'Ticket system' },
};

const INHERIT = {
  joinLog: ['welcomeLogChannel'],
  leaveLog: ['leaveLogChannel'],
  kickLog: ['modLogChannel'],
  banLog: ['modLogChannel'],
  unbanLog: ['banLog', 'modLogChannel'],
  roleChangeLog: ['guildLog', 'guildLogChannel'],
  nicknameChangeLog: ['guildLog', 'guildLogChannel'],
  messageEditLog: ['messageLogChannel'],
  messageDeleteLog: ['messageLogChannel'],
  bulkDeleteLog: ['messageDeleteLog', 'messageLogChannel'],
  channelCreateLog: ['guildLog', 'guildLogChannel'],
  channelDeleteLog: ['guildLog', 'guildLogChannel'],
  channelUpdateLog: ['guildLog', 'guildLogChannel'],
  roleCreateLog: ['guildLog', 'guildLogChannel'],
  roleDeleteLog: ['guildLog', 'guildLogChannel'],
  roleUpdateLog: ['guildLog', 'guildLogChannel'],
  voiceLog: ['guildLog', 'guildLogChannel'],
  webhookUpdateLog: ['guildLog', 'guildLogChannel'],
  modLog: ['modLogChannel', 'modlogChannel'],
  protectionLog: ['modLog', 'modLogChannel', 'modlogChannel'],
  ticketLog: ['modLog', 'modLogChannel', 'modlogChannel'],
};

const LOG_DEFAULT_KEYS = [...new Set(Object.values(LOG_TYPES))];
const LOG_DEFAULTS = {};
for (const key of LOG_DEFAULT_KEYS) {
  LOG_DEFAULTS[key] = { enabled: false, channel: null };
}

const bulkDeleted = new Set();

function trackBulkDelete(ids) {
  for (const id of ids) {
    if (!bulkDeleted.has(id)) {
      bulkDeleted.add(id);
      setTimeout(() => bulkDeleted.delete(id), 60000);
    }
  }
}

function isBulkDeleted(id) {
  return bulkDeleted.has(id);
}

async function sendLog(guild, type, embed) {
  if (!guild) return false;
  const settings = db.guilds.get(guild.id, 'settings') || {};
  const logKey = LOG_TYPES[type];
  if (!logKey) return false;
  const cfg = settings.logs?.[logKey];
  if (!cfg || !cfg.enabled || !cfg.channel) return false;
  const channel = guild.channels.cache.get(cfg.channel);
  if (!channel || !channel.isTextBased()) return false;
  try {
    await channel.send({ embeds: [embed] });
    return true;
  } catch (e) {
    logger.warn(`لا يمكن الارسال لسجل ${guild.name}:`, e.message);
    return false;
  }
}

async function sendModLog(guild, embed) {
  return sendLog(guild, 'mod', embed);
}

function getSettings(guildId) {
  const settings = db.guilds.ensure(guildId, 'settings', {
    logChannel: null,
    modLogChannel: null,
    welcomeLogChannel: null,
    leaveLogChannel: null,
    messageLogChannel: null,
    guildLogChannel: null,
    modlogChannel: null,
    welcomeChannel: null,
    leaveChannel: null,
    autorole: null,
    modRole: null,
    welcomeEnabled: true,
    leaveEnabled: true,
    economyEnabled: true,
  });

  if (!settings.logs || typeof settings.logs !== 'object') settings.logs = {};
  for (const key of LOG_DEFAULT_KEYS) {
    if (!settings.logs[key] || typeof settings.logs[key] !== 'object') {
      settings.logs[key] = { enabled: false, channel: null };
    }
  }
  for (const [logKey, sources] of Object.entries(INHERIT)) {
    const cfg = settings.logs[logKey];
    if (cfg.channel) continue;
    for (const src of sources) {
      const toggle = settings.logs[src];
      let channel = null;
      if (toggle && toggle.enabled && toggle.channel) channel = toggle.channel;
      else if (settings[src]) channel = settings[src];
      if (channel) {
        cfg.channel = channel;
        cfg.enabled = true;
        break;
      }
    }
  }
  return settings;
}

function getProtection(guildId) {
  const defaults = {
    antiSpam: { enabled: false, limit: 6, window: 5000, punishment: 'mute' },
    antiLink: { enabled: false },
    antiInvite: { enabled: false },
    badWords: { enabled: false, list: [] },
    ghostPing: { enabled: false },
    antiRaid: { enabled: false, limit: 8, window: 10000 },
    maxMentions: 5,
    antiNuke: { enabled: false, whitelist: [] },
    antiBot: { enabled: false, whitelist: [] },
    antiWebhook: { enabled: false },
    antiAlt: { enabled: false, maxAgeDays: 3 },
    maxWarns: { enabled: false, count: 3, punishment: 'mute' },
    verification: { enabled: false, role: null },
    roleProtect: { enabled: false, whitelist: [] },
  };

  const protection = db.guilds.ensure(guildId, 'protection', defaults);
  for (const key of Object.keys(defaults)) {
    const d = defaults[key];
    if (d && typeof d === 'object' && !Array.isArray(d)) {
      if (!protection[key] || typeof protection[key] !== 'object' || Array.isArray(protection[key])) {
        protection[key] = { ...d };
      } else {
        protection[key] = { ...d, ...protection[key] };
      }
    }
  }
  if (Array.isArray(protection.badWords.list)) {
    protection.badWords.list = protection.badWords.list
      .map((w) => (typeof w === 'string' ? { word: w, punishment: 'warn' } : w))
      .filter((w) => w && typeof w.word === 'string' && w.word);
  } else {
    protection.badWords.list = [];
  }
  return protection;
}

function getSettingsAll(guildId) {
  return db.guilds.get(guildId) || {};
}

module.exports = {
  sendLog, sendModLog, getSettings, getProtection, getSettingsAll,
  LOG_TYPES, LOG_TYPE_LABELS, trackBulkDelete, isBulkDeleted,
};
