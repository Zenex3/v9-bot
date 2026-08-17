const { db } = require('../utils/database');
const { embed } = require('../utils/embed');
const { parseDuration } = require('../utils/functions');
const logger = require('../utils/logger');

const MAX_DELAY = 2147483647;
const timers = new Map();

function getSchedules(guildId) {
  return db.guilds.ensure(guildId, 'schedules', []);
}

function setSchedules(guildId, list) {
  db.guilds.set(guildId, 'schedules', list);
}

function scheduleTimeout(fn, delay) {
  let handle;
  function go(remaining) {
    if (remaining <= MAX_DELAY) {
      handle = setTimeout(fn, remaining);
    } else {
      handle = setTimeout(() => go(remaining - MAX_DELAY), MAX_DELAY);
    }
  }
  go(delay);
  return { clear() { clearTimeout(handle); } };
}

async function fire(client, guildId, item) {
  const guild = client.guilds.cache.get(guildId);
  const channel = guild?.channels.cache.get(item.channelId);
  if (!channel || !channel.isTextBased()) {
    logger.warn(`[schedule] skipped channel missing guild=${guildId} id=${item.id}`);
    return;
  }
  const payload = {};
  if (item.content) payload.content = item.content;
  if (item.embed) {
    try { payload.embeds = [embed(guild, item.embed)]; } catch (e) { logger.warn(`[schedule] embed build failed id=${item.id}: ${e.message}`); }
  }
  try {
    await channel.send(payload);
    logger.info(`[schedule] sent id=${item.id} guild=${guildId}`);
  } catch (e) {
    logger.warn(`[schedule] send failed id=${item.id}: ${e.message}`);
  }
}

function arm(client, guildId, item) {
  const key = `${guildId}.${item.id}`;
  const existing = timers.get(key);
  if (existing) existing.clear();
  const delay = item.at - Date.now();
  if (delay <= 0) return;
  const t = scheduleTimeout(async () => {
    timers.delete(key);
    await fire(client, guildId, item);
    if (item.interval) {
      item.at = Date.now() + item.interval;
      const list = getSchedules(guildId);
      const idx = list.findIndex((s) => s.id === item.id);
      if (idx !== -1) {
        list[idx].at = item.at;
        setSchedules(guildId, list);
      }
      arm(client, guildId, item);
    }
  }, delay);
  timers.set(key, t);
}

function addSchedule(client, guildId, data) {
  const item = { id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, ...data };
  const list = getSchedules(guildId);
  list.push(item);
  setSchedules(guildId, list);
  arm(client, guildId, item);
  return item;
}

function removeSchedule(client, guildId, id) {
  const list = getSchedules(guildId);
  const next = list.filter((s) => s.id !== id);
  setSchedules(guildId, next);
  const key = `${guildId}.${id}`;
  const t = timers.get(key);
  if (t) t.clear();
  timers.delete(key);
  return list.length !== next.length;
}

function clearSchedules(client, guildId) {
  const list = getSchedules(guildId);
  for (const item of list) {
    const key = `${guildId}.${item.id}`;
    const t = timers.get(key);
    if (t) t.clear();
    timers.delete(key);
  }
  setSchedules(guildId, []);
  return list.length;
}

function listSchedules(guildId) {
  return getSchedules(guildId);
}

function parseScheduleTime(input) {
  if (!input) return null;
  const trimmed = input.trim();
  if (/^\d+\s*(s|sec|m|min|h|hr|hour|d|day|w|week|ث|د|س|ي|اج|ثا|دق|سا)$/i.test(trimmed)) {
    const dur = parseDuration(trimmed);
    if (dur) return Date.now() + dur;
    return null;
  }
  const match = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
  if (match) {
    const [, y, m, d, hh = 0, mm = 0, ss = 0] = match;
    const date = new Date(+y, +m - 1, +d, +hh, +mm, +ss);
    if (!isNaN(date.getTime())) return date.getTime();
  }
  return null;
}

function init(client) {
  for (const { key, value } of db.guilds.db.all()) {
    if (Array.isArray(value && value.schedules)) {
      for (const item of value.schedules) {
        if (item.at && item.at > Date.now()) arm(client, key, item);
      }
    }
  }
  logger.info(`تم تحميل الجدولة الزمنية`);
}

module.exports = { init, addSchedule, removeSchedule, clearSchedules, listSchedules, parseScheduleTime };
