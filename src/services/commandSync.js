const { REST, Routes } = require('discord.js');
const crypto = require('crypto');
const config = require('../../config.json');
const { loadCommandFiles } = require('../handlers/commandHandler');
const { db } = require('../utils/database');
const logger = require('../utils/logger');

const DM_ALLOWED = ['shop', 'redeem', 'my', 'help', 'language'];
const STORE_KEY = 'commandSync';

function buildBodies() {
  const commands = loadCommandFiles();
  const bodies = commands.map((c) => {
    const body = c.data.toJSON();
    body.dm_permission = DM_ALLOWED.includes(c.data.name);
    return body;
  });
  const seen = new Set();
  const dupes = bodies.filter((b) => seen.has(b.name) || !seen.add(b.name));
  if (dupes.length) {
    throw new Error(`أوامر مكررة ممنوعة: ${dupes.map((d) => d.name).join(', ')} — اعد تسمية احدها اولا`);
  }
  return { commands, bodies };
}

function hashOf(bodies) {
  return crypto.createHash('sha1').update(JSON.stringify(bodies)).digest('hex');
}

async function clearGuildCommands(rest) {
  try {
    const guilds = await rest.get(Routes.userGuilds());
    let total = 0;
    for (const g of guilds) {
      try {
        const existing = await rest.get(Routes.applicationGuildCommands(config.clientId, g.id));
        if (existing.length) {
          await rest.put(Routes.applicationGuildCommands(config.clientId, g.id), { body: [] });
          total += existing.length;
          logger.info(`[SYNC] مسح ${existing.length} امر من ${g.name}`);
        }
      } catch {}
    }
    if (total) logger.success(`[SYNC] تم مسح ${total} امر guild قديم — الآن global فقط`);
  } catch (e) {
    logger.warn('[SYNC] تعذر مسح اوامر السيرفرات القديمة:', e.message);
  }
}

async function sync({ force = false } = {}) {
  const { bodies } = buildBodies();
  const rest = new REST({ version: '10' }).setToken(config.token);
  const hash = hashOf(bodies);
  const stored = db.bot.get(STORE_KEY) || {};
  const results = [];

  // تسجيل عالمي فقط
  if (force || stored.globalHash !== hash) {
    try {
      await rest.put(Routes.applicationCommands(config.clientId), { body: bodies });
      stored.globalHash = hash;
      results.push(`global ${bodies.length} commands`);
      logger.success(`[SYNC] سجلت ${bodies.length} امر عالميا (global)`);
    } catch (e) {
      logger.error('[SYNC] فشل التسجيل العالمي:', e.message);
    }
  } else {
    results.push('global up-to-date');
  }

  // مسح أي أوامر guild قديمة عند التسجيل الأولي أو عند force
  if (force || !stored.cleaned) {
    await clearGuildCommands(rest);
    stored.cleaned = true;
  }

  db.bot.set(STORE_KEY, stored);
  return results;
}

module.exports = { sync, buildBodies };
