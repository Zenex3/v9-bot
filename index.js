const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config.json');
const { loadCommandFiles } = require('./src/handlers/commandHandler');
const { loadEvents } = require('./src/handlers/eventHandler');
const { loadComponents } = require('./src/handlers/componentHandler');
const logger = require('./src/utils/logger');

const LOCK_FILE = path.join(__dirname, 'data', 'bot.lock');
function acquireLock() {
  if (fs.existsSync(LOCK_FILE)) {
    let pid = null;
    let script = null;
    try {
      const raw = fs.readFileSync(LOCK_FILE, 'utf8').trim();
      const data = JSON.parse(raw);
      pid = data?.pid;
      script = data?.script;
    } catch {
      const num = parseInt(fs.readFileSync(LOCK_FILE, 'utf8').trim(), 10);
      if (Number.isFinite(num)) pid = num;
    }
    if (pid && Number.isFinite(pid)) {
      let alive = true;
      try { process.kill(pid, 0); } catch { alive = false; }
      if (alive && script === __filename) {
        logger.error(`نسخة اخرى من البوت شغالة (PID ${pid}). اوقفها اولاً.`);
        process.exit(1);
      }
      try { fs.unlinkSync(LOCK_FILE); } catch {}
    }
  }
  try {
    fs.writeFileSync(LOCK_FILE, JSON.stringify({ pid: process.pid, script: __filename }));
  } catch (e) {
    logger.error('تعذر انشاء ملف القفل:', e.message);
  }
}
acquireLock();

process.on('exit', () => {
  try {
    if (fs.existsSync(LOCK_FILE)) {
      const data = JSON.parse(fs.readFileSync(LOCK_FILE, 'utf8'));
      if (data?.pid === process.pid) fs.unlinkSync(LOCK_FILE);
    }
  } catch {}
});

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.DirectMessageReactions,
    GatewayIntentBits.DirectMessageTyping,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction, Partials.GuildMember, Partials.User],
  allowedMentions: { parse: ['users', 'roles'], repliedUser: false },
});

client.commands = new Collection();
client.cooldowns = new Collection();
client.ticketCache = new Map();
client.giveawayTimers = new Map();

for (const cmd of loadCommandFiles()) {
  client.commands.set(cmd.data.name, cmd);
}

loadComponents();

client.on('raw', (d) => {
  if (d.t === 'MESSAGE_CREATE' && !d.d.guild_id) {
    logger.warn(`[RAW-DM] استقبلت رسالة خاص: من ${d.d.author?.id}، المحتوى: "${String(d.d.content || '').slice(0, 30)}"`);
  }
});

loadEvents(client);

client.login(config.token).catch((e) => {
  logger.error('فشل تسجيل دخول البوت:', e.message);
  process.exit(1);
});

module.exports = { client };
