const { ChannelType, PermissionFlagsBits, AttachmentBuilder } = require('discord.js');
const { db } = require('../utils/database');
const { sendLog } = require('./logService');
const { embed, row, ButtonBuilder, ButtonStyle } = require('../utils/embed');
const { formatDate } = require('../utils/functions');
const logger = require('../utils/logger');

const TICKET_PERMS = [
  PermissionFlagsBits.ViewChannel,
  PermissionFlagsBits.SendMessages,
  PermissionFlagsBits.ReadMessageHistory,
  PermissionFlagsBits.AttachFiles,
  PermissionFlagsBits.EmbedLinks,
  PermissionFlagsBits.AddReactions,
];

const DEFAULT_CONFIG = {
  counter: 0,
  categoryId: null,
  supportRoleId: null,
  logChannelId: null,
  maxPerUser: 3,
  types: [],
  tickets: {},
};

function getConfig(guildId) {
  const cfg = db.tickets.ensure(guildId, { ...DEFAULT_CONFIG });
  for (const key of Object.keys(DEFAULT_CONFIG)) {
    if (cfg[key] === undefined || cfg[key] === null) cfg[key] = DEFAULT_CONFIG[key];
  }
  if (typeof cfg.counter !== 'number') cfg.counter = 0;
  if (!Array.isArray(cfg.types)) cfg.types = [];
  if (!cfg.tickets || typeof cfg.tickets !== 'object') cfg.tickets = {};

  const old = db.guilds.get(guildId, 'ticketSettings');
  if (old && (old.category || old.supportRole || old.logChannel)) {
    if (!cfg.categoryId) cfg.categoryId = old.category || null;
    if (!cfg.supportRoleId) cfg.supportRoleId = old.supportRole || null;
    if (!cfg.logChannelId) cfg.logChannelId = old.logChannel || null;
    if (!cfg.types.length) {
      cfg.types.push({ id: 'type_general', name: 'general', label: 'دعم عام', emoji: '🎫', description: 'تواصل مع فريق الدعم' });
    }
    saveConfig(guildId);
    db.guilds.delete(guildId, 'ticketSettings');
  }

  return cfg;
}

function saveConfig(guildId) {
  db.tickets.set(guildId, db.tickets.get(guildId));
}

function getTicket(guildId, channelId) {
  return getConfig(guildId).tickets[channelId] || null;
}

function isTicketChannel(guildId, channelId) {
  return !!getTicket(guildId, channelId);
}

function isStaff(member, cfg) {
  if (!member) return false;
  if (member.permissions?.has(PermissionFlagsBits.ManageChannels) || member.permissions?.has(PermissionFlagsBits.Administrator)) return true;
  if (cfg && cfg.supportRoleId) {
    const role = member.guild?.roles.cache.get(cfg.supportRoleId);
    return role ? member.roles.cache.has(role.id) : false;
  }
  return false;
}

function isParticipant(ticket, member) {
  if (!ticket || !member) return false;
  if (member.permissions?.has(PermissionFlagsBits.ManageChannels) || member.permissions?.has(PermissionFlagsBits.Administrator)) return true;
  return ticket.participants.includes(member.id);
}

function getType(cfg, typeId) {
  return cfg.types.find((t) => t.id === typeId) || null;
}

function logTicket(guild, logEmbed) {
  return sendLog(guild, 'ticket', logEmbed);
}

function buildPanelEmbed(guild, types) {
  const lines = types.map((t) => `${t.emoji} **${t.label}** — ${t.description || 'افتح تذكرة'}`);
  return embed(guild, {
    title: '🎫 نظام التذاكر',
    description: `**${guild.name}**\n\nاختر نوع التذكرة من الأزرار بالأسفل وسيتم فتح روم خاص بك\\.\n\n${lines.join('\n')}`,
    color: 'info',
  });
}

function buildPanelRows(types) {
  const buttons = types.map((t) => {
    const btn = new ButtonBuilder()
      .setCustomId(`ticket_open:${t.id}`)
      .setLabel(t.label)
      .setStyle(ButtonStyle.Primary);
    if (t.emoji) btn.setEmoji(t.emoji);
    return btn;
  });
  const rows = [];
  for (let i = 0; i < buttons.length; i += 5) {
    rows.push(row(...buttons.slice(i, i + 5)));
  }
  return rows;
}

function buildTicketEmbed(guild, ticket, type) {
  const status = ticket.status === 'open'
    ? { text: '🟢 مفتوحة', color: 'success' }
    : { text: '🔴 مغلقة', color: 'error' };
  const fields = [
    { name: '🎟️ رقم التذكرة', value: `#${ticket.id}`, inline: true },
    { name: '📝 الحالة', value: status.text, inline: true },
    { name: '👤 المالك', value: `<@${ticket.userId}>`, inline: true },
    { name: '📂 النوع', value: type ? `${type.emoji} ${type.label}` : '—', inline: true },
    { name: '🕒 فتحت', value: `<t:${Math.floor(ticket.createdAt / 1000)}:F>`, inline: true },
  ];
  if (ticket.claimedBy) {
    fields.push({ name: '🙋 مسؤول عنها', value: `<@${ticket.claimedBy}>`, inline: true });
  } else {
    fields.push({ name: '🙋 مسؤول عنها', value: 'غير مضمونة بعد', inline: true });
  }
  if (ticket.closedAt) {
    fields.push({ name: '🔒 اغلقها', value: ticket.closedBy ? `<@${ticket.closedBy}>` : '—', inline: true });
    fields.push({ name: '🕒 اغلقت', value: `<t:${Math.floor(ticket.closedAt / 1000)}:F>`, inline: true });
  }
  const description = [
    `**المستخدم:** <@${ticket.userId}>`,
    ticket.closeReason ? `**سبب الاغلاق:** ${ticket.closeReason}` : null,
  ].filter(Boolean).join('\n');
  return embed(guild, { title: `🎫 تذكرة #${ticket.id}`, description, fields, color: status.color });
}

function buildTicketButtons(ticket) {
  if (ticket.status === 'closed') {
    return [
      row(
        new ButtonBuilder().setCustomId('ticket_reopen').setLabel('إعادة فتح').setEmoji('🔓').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('ticket_transcript').setLabel('نسخة المحادثة').setEmoji('📄').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('ticket_delete').setLabel('حذف').setEmoji('🗑️').setStyle(ButtonStyle.Danger),
      ),
    ];
  }
  return [
    row(
      ticket.claimedBy
        ? new ButtonBuilder().setCustomId('ticket_unclaim').setLabel('الغاء المطالبة').setEmoji('🙋').setStyle(ButtonStyle.Secondary)
        : new ButtonBuilder().setCustomId('ticket_claim').setLabel('مطالبة').setEmoji('🙋').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('ticket_close').setLabel('اغلاق').setEmoji('🔒').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('ticket_transcript').setLabel('نسخة المحادثة').setEmoji('📄').setStyle(ButtonStyle.Secondary),
    ),
  ];
}

async function createTicket(guild, member, typeId) {
  const cfg = getConfig(guild.id);
  if (!cfg.categoryId) return { error: 'no_category' };
  const category = guild.channels.cache.get(cfg.categoryId);
  if (!category) return { error: 'no_category' };
  const type = getType(cfg, typeId);
  if (!type) return { error: 'no_type' };

  const openTickets = Object.values(cfg.tickets).filter((t) => t.userId === member.id && t.status === 'open');
  if (openTickets.length >= (cfg.maxPerUser || 3)) return { error: 'max_tickets' };
  if (openTickets.some((t) => t.type === typeId)) return { error: 'duplicate_type' };

  cfg.counter += 1;
  const id = cfg.counter;
  const base = type.name || type.label;
  const channelName = `${base.toLowerCase().replace(/[^a-z0-9]/gi, '').slice(0, 30)}-${id}` || `ticket-${id}`;

  const channel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: category.id,
    topic: `Ticket #${id} — ${member.user.tag}`,
    permissionOverwrites: [
      { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
      { id: member.id, allow: TICKET_PERMS },
      { id: guild.members.me.id, allow: [...TICKET_PERMS, PermissionFlagsBits.ManageChannels] },
    ],
  });
  if (cfg.supportRoleId) {
    await channel.permissionOverwrites.create(cfg.supportRoleId, { allow: TICKET_PERMS }).catch(() => {});
  }

  const ticket = {
    id,
    channelId: channel.id,
    userId: member.id,
    type: type.id,
    status: 'open',
    claimedBy: null,
    participants: [member.id],
    createdAt: Date.now(),
    closedAt: null,
    closedBy: null,
    closeReason: null,
  };
  cfg.tickets[channel.id] = ticket;
  saveConfig(guild.id);

  const introEmbed = buildTicketEmbed(guild, ticket, type);
  const sent = await channel.send({
    content: cfg.supportRoleId ? `<@&${cfg.supportRoleId}>` : null,
    embeds: [introEmbed],
    components: buildTicketButtons(ticket),
  });
  ticket.introMessageId = sent.id;
  saveConfig(guild.id);

  logTicket(guild, embed(guild, {
    title: '🎫 تذكرة جديدة',
    description: `**رقم:** #${id}\n**المستخدم:** ${member}\n**النوع:** ${type.emoji} ${type.label}\n**القناة:** ${channel}`,
    color: 'success',
  }));

  return { ok: true, channel, ticket, cfg };
}

async function updateIntroMessage(guild, ticket) {
  const channel = guild.channels.cache.get(ticket.channelId);
  if (!channel) return;
  const type = getType(getConfig(guild.id), ticket.type);
  try {
    const msg = await channel.messages.fetch(ticket.introMessageId).catch(() => null);
    if (msg) {
      await msg.edit({ embeds: [buildTicketEmbed(guild, ticket, type)], components: buildTicketButtons(ticket) });
    } else {
      await channel.send({ embeds: [buildTicketEmbed(guild, ticket, type)], components: buildTicketButtons(ticket) });
    }
  } catch {}
}

async function closeTicket(guild, channel, closer, reason) {
  const cfg = getConfig(guild.id);
  const ticket = cfg.tickets[channel.id];
  if (!ticket) return { error: 'not_ticket' };
  if (ticket.status === 'closed') return { error: 'already_closed' };

  ticket.status = 'closed';
  ticket.closedBy = closer.id;
  ticket.closedAt = Date.now();
  ticket.closeReason = reason || null;
  saveConfig(guild.id);

  for (const uid of ticket.participants) {
    await channel.permissionOverwrites.create(uid, { deny: [PermissionFlagsBits.ViewChannel] }).catch(() => {});
  }

  await updateIntroMessage(guild, ticket);

  const summary = embed(guild, {
    title: '🔒 التذكرة مغلقة',
    description: `اغلقها: **${closer}**\n${reason ? `**السبب:** ${reason}` : ''}`,
    color: 'error',
  });
  await channel.send({ embeds: [summary] }).catch(() => {});

  await sendTranscriptCopy(guild, channel, ticket, ticket.userId);

  logTicket(guild, embed(guild, {
    title: '🔒 تذكرة مغلقة',
    description: `**رقم:** #${ticket.id}\n**القناة:** ${channel}\n**اغلقها:** ${closer}\n${reason ? `**السبب:** ${reason}` : ''}`,
    color: 'warning',
  }));
  return { ok: true };
}

async function reopenTicket(guild, channel, member) {
  const cfg = getConfig(guild.id);
  const ticket = cfg.tickets[channel.id];
  if (!ticket) return { error: 'not_ticket' };
  if (ticket.status === 'open') return { error: 'already_open' };

  ticket.status = 'open';
  ticket.closedAt = null;
  ticket.closedBy = null;
  ticket.closeReason = null;
  saveConfig(guild.id);

  for (const uid of ticket.participants) {
    await channel.permissionOverwrites.create(uid, { allow: TICKET_PERMS }).catch(() => {});
  }

  await updateIntroMessage(guild, ticket);
  await channel.send({ embeds: [embed(guild, { title: '🔓 اعيد فتح التذكرة', description: `بواسطة: **${member}**`, color: 'success' })] }).catch(() => {});

  logTicket(guild, embed(guild, { title: '🔓 اعيد فتح التذكرة', description: `**رقم:** #${ticket.id}\n**القناة:** ${channel}\n**بواسطة:** ${member}`, color: 'success' }));
  return { ok: true };
}

async function claimTicket(guild, channel, member) {
  const cfg = getConfig(guild.id);
  const ticket = cfg.tickets[channel.id];
  if (!ticket) return { error: 'not_ticket' };
  if (ticket.status !== 'open') return { error: 'not_open' };
  ticket.claimedBy = member.id;
  saveConfig(guild.id);
  await updateIntroMessage(guild, ticket);
  await channel.send({ embeds: [embed(guild, { title: '🙋 تمت المطالبة', description: `**${member}** سيتولى هذه التذكرة`, color: 'success' })] }).catch(() => {});
  return { ok: true };
}

async function unclaimTicket(guild, channel, member) {
  const cfg = getConfig(guild.id);
  const ticket = cfg.tickets[channel.id];
  if (!ticket) return { error: 'not_ticket' };
  ticket.claimedBy = null;
  saveConfig(guild.id);
  await updateIntroMessage(guild, ticket);
  await channel.send({ embeds: [embed(guild, { title: '🙋 الغيت المطالبة', description: `**${member}**`, color: 'info' })] }).catch(() => {});
  return { ok: true };
}

async function addMemberToTicket(guild, channel, member) {
  const cfg = getConfig(guild.id);
  const ticket = cfg.tickets[channel.id];
  if (!ticket) return { error: 'not_ticket' };
  if (ticket.participants.includes(member.id)) return { error: 'already_added' };
  ticket.participants.push(member.id);
  saveConfig(guild.id);
  await channel.permissionOverwrites.create(member.id, { allow: TICKET_PERMS }).catch(() => {});
  return { ok: true };
}

async function removeMemberFromTicket(guild, channel, member) {
  const cfg = getConfig(guild.id);
  const ticket = cfg.tickets[channel.id];
  if (!ticket) return { error: 'not_ticket' };
  if (member.id === ticket.userId) return { error: 'is_owner' };
  if (!ticket.participants.includes(member.id)) return { error: 'not_added' };
  ticket.participants = ticket.participants.filter((u) => u !== member.id);
  saveConfig(guild.id);
  await channel.permissionOverwrites.create(member.id, { deny: [PermissionFlagsBits.ViewChannel] }).catch(() => {});
  return { ok: true };
}

async function renameTicket(guild, channel, name) {
  const cfg = getConfig(guild.id);
  const ticket = cfg.tickets[channel.id];
  if (!ticket) return { error: 'not_ticket' };
  await channel.setName(String(name).replace(/[^a-z0-9-]/gi, '').slice(0, 100) || `ticket-${ticket.id}`).catch(() => {});
  return { ok: true };
}

async function deleteTicket(guild, channel, member) {
  const cfg = getConfig(guild.id);
  const ticket = cfg.tickets[channel.id];
  if (!ticket) return { error: 'not_ticket' };
  await sendTranscriptCopy(guild, channel, ticket, null);
  delete cfg.tickets[channel.id];
  saveConfig(guild.id);
  await channel.delete(`Ticket deleted by ${member.user.tag}`).catch(() => {});
  logTicket(guild, embed(guild, {
    title: '🗑️ تذكرة محذوفة',
    description: `**رقم:** #${ticket.id}\n**حذفها:** ${member}\n**صاحبها:** <@${ticket.userId}>`,
    color: 'error',
  }));
  return { ok: true };
}

async function fetchAllMessages(channel, max = 1000) {
  const all = [];
  let lastId;
  while (all.length < max) {
    const opts = { limit: 100 };
    if (lastId) opts.before = lastId;
    const msgs = await channel.messages.fetch(opts);
    if (!msgs.size) break;
    all.push(...msgs.values());
    lastId = msgs.last().id;
    if (msgs.size < 100) break;
  }
  return all.slice(0, max).sort((a, b) => a.createdTimestamp - b.createdTimestamp);
}

function buildTranscriptText(guild, ticket, channel, type, messages) {
  const lines = [];
  lines.push('==========================================');
  lines.push(`          نسخة محادثة التذكرة`);
  lines.push('==========================================');
  lines.push(`السيرفر: ${guild.name} (${guild.id})`);
  lines.push(`رقم التذكرة: #${ticket.id}`);
  lines.push(`النوع: ${type ? `${type.emoji} ${type.label}` : '—'}`);
  lines.push(`القناة: #${channel.name}`);
  lines.push(`صاحب التذكرة: <@${ticket.userId}>`);
  lines.push(`تاريخ الفتح: ${formatDate(ticket.createdAt)}`);
  if (ticket.closedAt) lines.push(`تاريخ الاغلاق: ${formatDate(ticket.closedAt)}`);
  if (ticket.closeReason) lines.push(`سبب الاغلاق: ${ticket.closeReason}`);
  lines.push('==========================================');
  lines.push('');
  if (!messages.length) {
    lines.push('(لا توجد رسائل)');
  }
  for (const m of messages) {
    if (m.system) continue;
    const time = formatDate(m.createdAt);
    const content = m.content || (m.attachments.size ? `[${m.attachments.size} مرفق]` : '(بدون نص)');
    lines.push(`[${time}] ${m.author.tag} (${m.author.id}): ${content}`);
  }
  lines.push('');
  lines.push('==========================================');
  lines.push('       نهاية نسخة المحادثة');
  lines.push('==========================================');
  return lines.join('\n');
}

async function generateTranscript(guild, channel) {
  const cfg = getConfig(guild.id);
  const ticket = cfg.tickets[channel.id];
  if (!ticket) return { error: 'not_ticket' };
  const messages = await fetchAllMessages(channel);
  const text = buildTranscriptText(guild, ticket, channel, getType(cfg, ticket.type), messages);
  const attachment = new AttachmentBuilder(Buffer.from(text, 'utf8'), { name: `ticket-${ticket.id}-transcript.txt` });
  return { ok: true, text, attachment, ticket };
}

async function sendTranscriptCopy(guild, channel, ticket, userId) {
  const cfg = getConfig(guild.id);
  try {
    const messages = await fetchAllMessages(channel);
    const text = buildTranscriptText(guild, ticket, channel, getType(cfg, ticket.type), messages);
    const attachment = new AttachmentBuilder(Buffer.from(text, 'utf8'), { name: `ticket-${ticket.id}-transcript.txt` });
    const title = embed(guild, {
      title: `📄 نسخة التذكرة #${ticket.id}`,
      description: `القناة: ${channel}\nالنوع: ${getType(cfg, ticket.type)?.label || '—'}\nعدد الرسائل: ${messages.length}`,
    });
    const logChannel = cfg.logChannelId ? guild.channels.cache.get(cfg.logChannelId) : null;
    if (logChannel?.isTextBased()) {
      await logChannel.send({ embeds: [title], files: [attachment] }).catch(() => {});
    }
    if (userId) {
      const user = await guild.client.users.fetch(userId).catch(() => null);
      if (user) {
        await user.send({ embeds: [embed(guild, { title: `📄 نسخة التذكرة #${ticket.id}`, description: `سيرفر **${guild.name}** — اغلقت تذكرتك وها هي نسخة المحادثة`, color: 'info' })], files: [attachment] }).catch(() => {});
      }
    }
  } catch (e) {
    logger.warn('فشل حفظ نسخة التذكرة:', e.message);
  }
}

module.exports = {
  getConfig, saveConfig, getTicket, isTicketChannel, isStaff, isParticipant, getType,
  buildPanelEmbed, buildPanelRows, buildTicketEmbed, buildTicketButtons,
  createTicket, closeTicket, reopenTicket, claimTicket, unclaimTicket,
  addMemberToTicket, removeMemberFromTicket, renameTicket, deleteTicket,
  generateTranscript, sendTranscriptCopy, fetchAllMessages, logTicket,
  TICKET_PERMS,
};
