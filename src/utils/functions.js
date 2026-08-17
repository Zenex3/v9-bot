const config = require('../../config.json');

function formatTime(ms) {
  const seconds = Math.floor(ms / 1000);
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const parts = [];
  if (d) parts.push(`${d} يوم`);
  if (h) parts.push(`${h} ساعة`);
  if (m) parts.push(`${m} دقيقة`);
  if (s) parts.push(`${s} ثانية`);
  return parts.length ? parts.join('، ') : '0 ثانية';
}

function formatDate(date) {
  return new Intl.DateTimeFormat('ar', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function timestamp(date) {
  return Math.floor(new Date(date).getTime() / 1000);
}

function relative(date) {
  return `<t:${timestamp(date)}:R>`;
}

function progressBar(current, max, size = 10, fill = '🟥', empty = '⬛') {
  if (max <= 0) max = 1;
  const percent = Math.min(1, Math.max(0, current / max));
  const filled = Math.round(size * percent);
  return fill.repeat(filled) + empty.repeat(size - filled);
}

function randomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle(array) {
  const a = [...array];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function escape(text) {
  return String(text ?? '').replace(/[*_`~|>#@]/g, '\\$&');
}

function truncate(text, max) {
  text = String(text ?? '');
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function hasHigherRole(member, target) {
  return member.roles.highest.position > target.roles.highest.position;
}

function isOwner(userId) {
  return config.owners.includes(userId);
}

function isModerator(member) {
  if (member.permissions.has('Administrator')) return true;
  const settings = require('./database').db.guilds.get(member.guild.id, 'settings');
  if (!settings || !settings.modRole) return false;
  const role = member.guild.roles.cache.get(settings.modRole);
  return role ? member.roles.cache.has(role.id) : false;
}

function parseDuration(input) {
  input = String(input).trim().toLowerCase();
  const match = input.match(/^(\d+)\s*(s|sec|secs|second|seconds|m|min|mins|minute|minutes|h|hr|hrs|hour|hours|d|day|days|w|week|weeks|ث|ثا|د|دق|س|سا|ي|اج)?$/);
  if (!match) return null;
  const value = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers = {
    s: 1000, sec: 1000, secs: 1000, second: 1000, seconds: 1000, ث: 1000, ثا: 1000,
    m: 60000, min: 60000, mins: 60000, minute: 60000, minutes: 60000, د: 60000, دق: 60000,
    h: 3600000, hr: 3600000, hrs: 3600000, hour: 3600000, hours: 3600000, س: 3600000, سا: 3600000,
    d: 86400000, day: 86400000, days: 86400000, ي: 86400000,
    w: 604800000, week: 604800000, weeks: 604800000, اج: 604800000,
  };
  const ms = value * (multipliers[unit] || 60000);
  return Number.isFinite(ms) ? ms : null;
}

function formatNumber(n) {
  return new Intl.NumberFormat('en').format(n || 0);
}

function getClientId() {
  return config.clientId;
}

module.exports = {
  formatTime, formatDate, timestamp, relative, progressBar, randomInt, shuffle,
  escape, truncate, hasHigherRole, isOwner, isModerator, parseDuration, formatNumber, getClientId,
};
