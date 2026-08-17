const logger = require('../utils/logger');

const MAX_EVENTS = 50;
const logs = new Map();

function getLog(guildId) {
  if (!logs.has(guildId)) logs.set(guildId, []);
  return logs.get(guildId);
}

function addEvent(guildId, event) {
  const list = getLog(guildId);
  list.unshift({
    type: event.type,
    action: event.action,
    name: event.name,
    id: event.id,
    executor: event.executor || null,
    timestamp: Date.now(),
  });
  if (list.length > MAX_EVENTS) list.length = MAX_EVENTS;
}

function getEvents(guildId, filter) {
  const list = getLog(guildId);
  if (!filter) return list;
  return list.filter((e) => filter.includes(e.type));
}

function clearEvents(guildId) {
  logs.set(guildId, []);
}

function formatEvent(e) {
  const icons = {
    role_create: '🎭',
    role_delete: '🗑️',
    channel_create: '📂',
    channel_delete: '🗑️',
    category_create: '📁',
    category_delete: '🗑️',
  };
  const actions = {
    role_create: 'انشاء رول',
    role_delete: 'حذف رول',
    channel_create: 'انشاء قناة',
    channel_delete: 'حذف قناة',
    category_create: 'انشاء كاتيجوري',
    category_delete: 'حذف كاتيجوري',
  };
  const iconsEn = {
    role_create: '🎭',
    role_delete: '🗑️',
    channel_create: '📂',
    channel_delete: '🗑️',
    category_create: '📁',
    category_delete: '🗑️',
  };
  const actionsEn = {
    role_create: 'Created role',
    role_delete: 'Deleted role',
    channel_create: 'Created channel',
    channel_delete: 'Deleted channel',
    category_create: 'Created category',
    category_delete: 'Deleted category',
  };
  const icon = icons[e.type] || '📝';
  const action = e.lang === 'en' ? (actionsEn[e.type] || e.type) : (actions[e.type] || e.type);
  const executor = e.executor ? ` — ${e.executor}` : '';
  const time = `<t:${Math.floor(e.timestamp / 1000)}:R>`;
  return `${icon} **${e.name}**${executor} (${time})`;
}

module.exports = { addEvent, getEvents, clearEvents, formatEvent };
