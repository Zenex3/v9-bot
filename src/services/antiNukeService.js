const { db } = require('../utils/database');
const { getProtection } = require('./logService');
const { isOwner } = require('../utils/functions');

function isProtected(guildId, userId) {
  if (!userId || isOwner(userId)) return false;
  const protection = getProtection(guildId);
  const antiNuke = protection.antiNuke;
  if (!antiNuke || !antiNuke.enabled) return false;
  if (antiNuke.whitelist.includes(userId)) return false;
  return true;
}

async function getExecutor(guild, type) {
  try {
    const logs = await guild.fetchAuditLogs({ type, limit: 1 });
    const entry = logs.entries.first();
    if (!entry) return null;
    return entry.executor;
  } catch {
    return null;
  }
}

module.exports = { isProtected, getExecutor };
