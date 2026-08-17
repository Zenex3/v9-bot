const { db } = require('../utils/database');
const logger = require('../utils/logger');

const invitesCache = new Map();

function key(guildId, inviteCode) {
  return `invite:${guildId}:${inviteCode}`;
}

function getInviteData(guildId, inviteCode) {
  return db.bot.get(key(guildId, inviteCode)) || null;
}

function setInviteData(guildId, inviteCode, data) {
  db.bot.set(key(guildId, inviteCode), data);
}

function getAllInviteData(guildId) {
  const prefix = `invite:${guildId}:`;
  const all = db.bot.data;
  const result = {};
  for (const k of Object.keys(all)) {
    if (k.startsWith(prefix)) {
      result[k.slice(prefix.length)] = all[k];
    }
  }
  return result;
}

function getUserInvites(guildId) {
  const all = getAllInviteData(guildId);
  const result = {};
  for (const data of Object.values(all)) {
    if (data && data.uses > 0 && !data.orphan) {
      if (!result[data.inviterId]) result[data.inviterId] = 0;
      result[data.inviterId] += data.uses;
    }
  }
  return result;
}

function getUserInviteBreakdown(guildId, inviterId) {
  const all = getAllInviteData(guildId);
  const invites = [];
  for (const data of Object.values(all)) {
    if (data && data.inviterId === inviterId && data.uses > 0 && !data.orphan) {
      invites.push(data);
    }
  }
  return invites;
}

async function initGuild(guild) {
  try {
    const realInvites = await guild.invites.fetch();
    const cached = invitesCache.get(guild.id) || new Map();
    for (const [, invite] of realInvites) {
      cached.set(invite.code, { uses: invite.uses, inviterId: invite.inviterId });
      const existing = getInviteData(guild.id, invite.code);
      if (!existing) {
        setInviteData(guild.id, invite.code, {
          code: invite.code,
          inviterId: invite.inviterId,
          uses: invite.uses,
          maxAge: invite.maxAge,
          maxUses: invite.maxUses,
          orphan: false,
        });
      } else if (existing.uses < invite.uses) {
        existing.uses = invite.uses;
        setInviteData(guild.id, invite.code, existing);
      }
    }
    invitesCache.set(guild.id, cached);
  } catch (e) {
    logger.warn(`[INVITE] فشل تهيئة انفايتات ${guild.name}:`, e.message);
  }
}

function cacheCreate(guildId, inviteData) {
  const cached = invitesCache.get(guildId) || new Map();
  cached.set(inviteData.code, { uses: inviteData.uses || 0, inviterId: inviteData.inviterId });
  invitesCache.set(guildId, cached);
}

function cacheDelete(guildId, code) {
  const cached = invitesCache.get(guildId);
  if (cached) cached.delete(code);
}

function markOrphan(guildId, code) {
  const data = getInviteData(guildId, code);
  if (data) {
    data.orphan = true;
    setInviteData(guildId, code, data);
  }
}

async function trackJoin(member) {
  const guildId = member.guild.id;
  const cached = invitesCache.get(guildId) || new Map();
  let usedInvite = null;
  let maxUses = -1;
  try {
    const realInvites = await member.guild.invites.fetch();
    for (const [, invite] of realInvites) {
      const old = cached.get(invite.code);
      if (old && invite.uses > old.uses) {
        if (invite.uses - old.uses > maxUses) {
          maxUses = invite.uses - old.uses;
          usedInvite = invite;
        }
      }
      cached.set(invite.code, { uses: invite.uses, inviterId: invite.inviterId });
    }
    invitesCache.set(guildId, cached);
  } catch {}
  if (!usedInvite) return null;

  const data = getInviteData(guildId, usedInvite.code);
  if (data) {
    data.uses = usedInvite.uses;
    setInviteData(guildId, usedInvite.code, data);
  }

  return {
    code: usedInvite.code,
    inviterId: usedInvite.inviterId,
    uses: usedInvite.uses,
  };
}

function resetUser(guildId, userId) {
  const all = getAllInviteData(guildId);
  let count = 0;
  for (const [code, data] of Object.entries(all)) {
    if (data && data.inviterId === userId) {
      data.uses = 0;
      setInviteData(guildId, code, data);
      count++;
    }
  }
  return count;
}

function resetAll(guildId) {
  const all = getAllInviteData(guildId);
  let count = 0;
  for (const [code, data] of Object.entries(all)) {
    if (data && data.uses > 0) {
      data.uses = 0;
      setInviteData(guildId, code, data);
      count++;
    }
  }
  return count;
}

module.exports = { initGuild, cacheCreate, cacheDelete, markOrphan, trackJoin, getUserInvites, getUserInviteBreakdown, getInviteData, resetUser, resetAll };
