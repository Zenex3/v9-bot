const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

class Database {
  constructor(name) {
    this.name = name;
    this.file = path.join(DATA_DIR, `${name}.json`);
    this.data = {};
    this._dirty = false;
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(this.file)) {
        this.data = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      } else {
        this.data = {};
        this.save(true);
      }
    } catch (e) {
      console.error(`[DB] Failed to load ${this.name}.json`, e);
      this.data = {};
      this.save(true);
    }
  }

  save(force = false) {
    this._dirty = true;
    if (force) {
      this._flush();
      return;
    }
    this._flush();
  }

  _flush() {
    if (!this._dirty) return;
    this._dirty = false;
    try {
      const tmp = `${this.file}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2), 'utf8');
      fs.renameSync(tmp, this.file);
    } catch (e) {
      console.error(`[DB] Failed to save ${this.name}.json`, e);
    }
  }

  flush() { this._flush(); }

  get(key) { return this.data[key]; }
  has(key) { return Object.prototype.hasOwnProperty.call(this.data, key); }
  set(key, value) { this.data[key] = value; this.save(); return value; }
  delete(key) { delete this.data[key]; this.save(); return true; }
  ensure(key, defaultValue) { if (!this.has(key)) { this.data[key] = defaultValue; this.save(); } return this.data[key]; }
  getAll() { return this.data; }
  all() { return Object.keys(this.data).map((k) => ({ key: k, value: this.data[k] })); }
  size() { return Object.keys(this.data).length; }
}

class GuildManager {
  constructor(db) {
    this.db = db;
  }
  guild(id) {
    return this.db.ensure(id, {});
  }
  get(guildId, key) {
    const g = this.guild(guildId);
    return key ? g[key] : g;
  }
  set(guildId, key, value) {
    const g = this.guild(guildId);
    g[key] = value;
    this.db.set(guildId, g);
    return value;
  }
  ensure(guildId, key, defaultValue) {
    const g = this.guild(guildId);
    if (g[key] === undefined) { g[key] = defaultValue; this.db.set(guildId, g); }
    return g[key];
  }
  has(guildId, key) {
    const g = this.guild(guildId);
    return g[key] !== undefined;
  }
  delete(guildId, key) {
    const g = this.guild(guildId);
    delete g[key];
    this.db.set(guildId, g);
    return true;
  }
  reset(guildId) {
    this.db.delete(guildId);
  }
}

const db = {
  guilds: new GuildManager(new Database('guilds')),
  members: new Database('members'),
  users: new Database('users'),
  giveaways: new Database('giveaways'),
  tickets: new Database('tickets'),
  bot: new Database('bot'),
  _raw: {
    guilds: null,
    members: null,
    users: null,
    giveaways: null,
    tickets: null,
    bot: null,
  },
};

db._raw.guilds = db.guilds.db;
db._raw.members = db.members;
db._raw.users = db.users;
db._raw.giveaways = db.giveaways;
db._raw.tickets = db.tickets;
db._raw.bot = db.bot;

function memberKey(guildId, userId) { return `${guildId}.${userId}`; }
function userKey(userId) { return userId; }

function getMember(guildId, userId) {
  const key = memberKey(guildId, userId);
  const current = db.members.get(key);
  if (current === undefined || current === null || typeof current !== 'object' || Array.isArray(current)) {
    db.members.set(key, {});
    return {};
  }
  return current;
}

process.on('exit', () => {
  db.guilds.db.flush();
  db.members.flush();
  db.users.flush();
  db.giveaways.flush();
  db.tickets.flush();
  db.bot.flush();
});

const ALL_DBS = () => [db.guilds.db, db.members, db.users, db.giveaways, db.tickets, db.bot];
function flushAll() { for (const d of ALL_DBS()) d.flush(); }

process.on('SIGINT', () => { flushAll(); process.exit(0); });
process.on('SIGTERM', () => { flushAll(); process.exit(0); });

setInterval(flushAll, 60_000).unref();

module.exports = { db, memberKey, userKey, getMember, Database, DATA_DIR, flushAll };
