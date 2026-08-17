const { embed, row, ButtonBuilder, ButtonStyle } = require('../utils/embed');
const { db } = require('../utils/database');
const { t } = require('../utils/i18n');

const SUGGEST_PREFIX = 'suggest_vote_';

function getConfig(guildId) {
  return db.guilds.ensure(guildId, 'suggest', { enabled: false, channel: null });
}

function getRecords(guildId) {
  return db.guilds.ensure(guildId, 'suggestions', {});
}

function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function buildEmbed(guild, rec, userId) {
  const up = rec.upvotes.length;
  const down = rec.downvotes.length;
  return embed(guild, {
    title: t(userId, 'sug_new_title'),
    description: rec.content || t(userId, 'sug_no_content'),
    color: 'info',
    fields: [
      { name: t(userId, 'sug_upvotes'), value: `**${up}**`, inline: true },
      { name: t(userId, 'sug_downvotes'), value: `**${down}**`, inline: true },
      { name: t(userId, 'sug_score'), value: `**${up - down}**`, inline: true },
    ],
    author: { name: rec.authorName, iconURL: rec.authorAvatar },
    footer: { text: t(userId, 'sug_footer', rec.id.slice(0, 6)) },
  });
}

function buildButtons(rec) {
  return [
    row(
      new ButtonBuilder()
        .setCustomId(`${SUGGEST_PREFIX}up_${rec.id}`)
        .setLabel(`👍 ${rec.upvotes.length}`)
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`${SUGGEST_PREFIX}down_${rec.id}`)
        .setLabel(`👎 ${rec.downvotes.length}`)
        .setStyle(ButtonStyle.Danger),
    ),
  ];
}

async function postSuggestion(guild, author, content, attachmentUrl) {
  const cfg = getConfig(guild.id);
  if (!cfg.enabled || !cfg.channel) return { error: 'not_configured' };
  const channel = guild.channels.cache.get(cfg.channel);
  if (!channel || !channel.isTextBased()) return { error: 'no_channel' };

  const text = (content || '').trim();
  if (!text && !attachmentUrl) return { error: 'empty' };

  const records = getRecords(guild.id);
  const id = newId();
  const rec = {
    id,
    userId: author.id,
    authorName: author.username,
    authorAvatar: author.displayAvatarURL({ size: 256 }),
    content: text + (attachmentUrl ? `\n${attachmentUrl}` : ''),
    upvotes: [],
    downvotes: [],
    createdAt: Date.now(),
    messageId: null,
    channelId: channel.id,
  };

  const msg = await channel.send({ embeds: [buildEmbed(guild, rec, author.id)], components: buildButtons(rec) }).catch(() => null);
  if (!msg) return { error: 'send_failed' };

  rec.messageId = msg.id;
  records[id] = rec;
  db.guilds.set(guild.id, 'suggestions', records);
  return { ok: true, id, messageId: msg.id, channel };
}

async function applyVote(guild, interaction, suggestionId, direction) {
  const records = getRecords(guild.id);
  const rec = records[suggestionId];
  if (!rec) return { error: 'not_found' };

  const userId = interaction.user.id;
  const up = rec.upvotes;
  const down = rec.downvotes;
  const inUp = up.indexOf(userId);
  const inDown = down.indexOf(userId);

  if (direction === 'up') {
    if (inUp !== -1) up.splice(inUp, 1);
    else {
      up.push(userId);
      if (inDown !== -1) down.splice(inDown, 1);
    }
  } else {
    if (inDown !== -1) down.splice(inDown, 1);
    else {
      down.push(userId);
      if (inUp !== -1) up.splice(inUp, 1);
    }
  }

  records[suggestionId] = rec;
  db.guilds.set(guild.id, 'suggestions', records);

  const channel = guild.channels.cache.get(rec.channelId);
  const msg = channel ? await channel.messages.fetch(rec.messageId).catch(() => null) : null;
  if (msg) {
    await msg.edit({ embeds: [buildEmbed(guild, rec, userId)], components: buildButtons(rec) }).catch(() => {});
  }
  return { ok: true, rec };
}

module.exports = {
  SUGGEST_PREFIX, getConfig, getRecords, newId, buildEmbed, buildButtons, postSuggestion, applyVote,
};
