const { ChannelType, PermissionFlagsBits } = require('discord.js');
const { db } = require('../utils/database');
const logger = require('../utils/logger');

const TOPIC_PREFIX = 'tempvoice:';

const tempChannelIds = new Set();
const creating = new Set();

function getConfig(guildId) {
  return db.guilds.ensure(guildId, 'tempvoice', {
    enabled: false,
    createChannel: null,
    category: null,
    nameFormat: '{user}',
    userLimit: 0,
  });
}

function setConfig(guildId, cfg) {
  db.guilds.set(guildId, 'tempvoice', cfg);
  return cfg;
}

async function handleVoiceUpdate(client, oldState, newState) {
  const guildId = newState.guild?.id || oldState.guild?.id;
  if (!guildId) return;
  const cfg = getConfig(guildId);
  if (!cfg.enabled) return;

  const member = newState.member || oldState.member;
  if (!member || member.user.bot) return;
  const oldChan = oldState.channel;
  const newChan = newState.channel;

  if (newChan && cfg.createChannel && newChan.id === cfg.createChannel) {
    await createTempChannel(member, cfg);
    return;
  }

  if (oldChan && tempChannelIds.has(oldChan.id)) {
    scheduleDelete(oldChan);
  }
}

async function createTempChannel(member, cfg) {
  const guild = member.guild;
  if (creating.has(member.id)) return;
  creating.add(member.id);
  try {
    const botMember = guild.members.me;
    if (!botMember.permissions.has(PermissionFlagsBits.MoveMembers)) {
      logger.warn(`[TEMPVOICE] البوت مش فاضي Move Members في ${guild.name}`);
      return;
    }

    const parent = cfg.category ? guild.channels.cache.get(cfg.category) : null;
    const name = member.displayName || member.user.username;
    const channel = await guild.channels.create({
      name: name.slice(0, 100),
      type: ChannelType.GuildVoice,
      parent: parent?.id || undefined,
      userLimit: Math.max(0, cfg.userLimit || 0),
      topic: `${TOPIC_PREFIX}${member.id}`,
    });
    tempChannelIds.add(channel.id);

    try {
      await member.voice.setChannel(channel);
    } catch (moveErr) {
      logger.warn(`[TEMPVOICE] فشل نقل ${member.user.tag}: ${moveErr.message}`);
      tempChannelIds.delete(channel.id);
      await channel.delete('فشل نقل العضو').catch(() => {});
    }
  } catch (e) {
    logger.warn(`فشل انشاء روم صوتي مؤقت لـ ${member.user.tag}:`, e.message);
  } finally {
    creating.delete(member.id);
  }
}

function scheduleDelete(channel) {
  if (!tempChannelIds.has(channel.id)) return;
  setTimeout(async () => {
    if (!tempChannelIds.has(channel.id)) return;
    try {
      const live = channel.guild.channels.cache.get(channel.id);
      if (!live) {
        tempChannelIds.delete(channel.id);
        return;
      }
      if (live.members.size > 0) return;
      tempChannelIds.delete(channel.id);
      await live.delete('روم صوتي مؤقت فارغ').catch(() => {});
    } catch {}
  }, 5000);
}

async function cleanupOrphans(client) {
  for (const guild of client.guilds.cache.values()) {
    const cfg = getConfig(guild.id);
    if (!cfg.enabled) continue;
    for (const channel of guild.channels.cache.values()) {
      if (channel.type !== ChannelType.GuildVoice) continue;
      if (!String(channel.topic || '').startsWith(TOPIC_PREFIX)) continue;
      tempChannelIds.add(channel.id);
      if (channel.members.size === 0) {
        setTimeout(() => {
          if (channel.members.size === 0) {
            tempChannelIds.delete(channel.id);
            channel.delete('روم صوتي مؤقت فارغ').catch(() => {});
          }
        }, 3000);
      }
    }
  }
}

module.exports = { getConfig, setConfig, handleVoiceUpdate, cleanupOrphans, TOPIC_PREFIX };
