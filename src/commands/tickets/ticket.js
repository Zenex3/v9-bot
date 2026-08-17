const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { embed, successEmbed, errorEmbed } = require('../../utils/embed');
const { L } = require('../../utils/i18n');
const T = require('../../services/ticketService');

const ERRORS = {
  not_ticket: ['❌', 'هذه القناة ليست تذكرة', 'This channel is not a ticket'],
  already_closed: ['❌', 'التذكرة مغلقة بالفعل', 'The ticket is already closed'],
  already_open: ['❌', 'التذكرة مفتوحة بالفعل', 'The ticket is already open'],
  not_open: ['❌', 'التذكرة غير مفتوحة', 'The ticket is not open'],
  no_category: ['⚠️', 'حدد كاتيجوري التذاكر اولا عبر `/ticket setup category`', 'Set a ticket category first via `/ticket setup category`'],
  no_type: ['❌', 'نوع التذكرة غير موجود', 'Ticket type not found'],
  max_tickets: ['⚠️', 'وصلت للحد الاقصى من التذاكر المفتوحة', 'You reached the max open tickets limit'],
  duplicate_type: ['⚠️', 'لديك تذكرة مفتوحة من هذا النوع بالفعل', 'You already have an open ticket of this type'],
  already_added: ['❌', 'هذا العضو مضاف للتذكرة بالفعل', 'This member is already added'],
  not_added: ['❌', 'هذا العضو ليس مضافاً للتذكرة', 'This member is not added to the ticket'],
  is_owner: ['❌', 'لا يمكن ازالة مالك التذكرة', 'You cannot remove the ticket owner'],
};

function replyError(interaction, result) {
  const l = interaction.user.id;
  const err = ERRORS[result.error] || ['❌', 'حدث خطا', 'Something went wrong'];
  return interaction.reply({ embeds: [errorEmbed(interaction.guild, err[0], L(l, err[1], err[2]))], ephemeral: true });
}

function isAdmin(interaction) {
  return interaction.memberPermissions?.has(PermissionFlagsBits.Administrator) || interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild);
}

module.exports = {
  category: 'tickets',
  descEn: 'Professional ticket system — panel, support, close, reopen, transcript',
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('نظام التذاكر الاحترافي')
    .setDescriptionLocalizations({ 'en-US': 'Professional ticket system' })

    .addSubcommandGroup((g) => g.setName('setup').setDescription(L('x', 'اعدادات نظام التذاكر', 'Ticket system setup')).setDescriptionLocalizations({ 'en-US': 'Ticket system setup' })
      .addSubcommand((s) => s.setName('category').setDescription(L('x', 'كاتيجوري التذاكر', 'Ticket category')).setDescriptionLocalizations({ 'en-US': 'Ticket category' }).addChannelOption((o) => o.setName('category').setDescription(L('x', 'الكيتجوري', 'Category')).setDescriptionLocalizations({ 'en-US': 'Category' }).addChannelTypes(ChannelType.GuildCategory).setRequired(true)))
      .addSubcommand((s) => s.setName('support').setDescription(L('x', 'رول الدعم', 'Support role')).setDescriptionLocalizations({ 'en-US': 'Support role' }).addRoleOption((o) => o.setName('role').setDescription(L('x', 'رول الدعم', 'Support role')).setDescriptionLocalizations({ 'en-US': 'Support role' }).setRequired(true)))
      .addSubcommand((s) => s.setName('log').setDescription(L('x', 'قناة نسخ المحادثات', 'Transcript log channel')).setDescriptionLocalizations({ 'en-US': 'Transcript log channel' }).addChannelOption((o) => o.setName('channel').setDescription(L('x', 'القناة', 'Channel')).setDescriptionLocalizations({ 'en-US': 'Channel' }).setRequired(true)))
      .addSubcommand((s) => s.setName('max').setDescription(L('x', 'الحد الاقصى للتذاكر لكل عضو', 'Max open tickets per user')).setDescriptionLocalizations({ 'en-US': 'Max open tickets per user' }).addIntegerOption((o) => o.setName('count').setDescription(L('x', 'العدد', 'Count')).setDescriptionLocalizations({ 'en-US': 'Count' }).setRequired(true).setMinValue(1).setMaxValue(10)))
      .addSubcommand((s) => s.setName('status').setDescription(L('x', 'عرض اعدادات التذاكر', 'Show ticket settings')).setDescriptionLocalizations({ 'en-US': 'Show ticket settings' })))

    .addSubcommandGroup((g) => g.setName('types').setDescription(L('x', 'ادارة انواع التذاكر', 'Manage ticket types')).setDescriptionLocalizations({ 'en-US': 'Manage ticket types' })
      .addSubcommand((s) => s.setName('add').setDescription(L('x', 'اضافة نوع تذكرة', 'Add a ticket type')).setDescriptionLocalizations({ 'en-US': 'Add a ticket type' }).addStringOption((o) => o.setName('label').setDescription(L('x', 'الاسم', 'Label')).setDescriptionLocalizations({ 'en-US': 'Label' }).setRequired(true).setMaxLength(30)).addStringOption((o) => o.setName('emoji').setDescription(L('x', 'الايموجي', 'Emoji')).setDescriptionLocalizations({ 'en-US': 'Emoji' }).setRequired(true)).addStringOption((o) => o.setName('description').setDescription(L('x', 'الوصف (اختياري)', 'Description (optional)')).setDescriptionLocalizations({ 'en-US': 'Description (optional)' }).setMaxLength(80)))
      .addSubcommand((s) => s.setName('remove').setDescription(L('x', 'حذف نوع تذكرة', 'Remove a ticket type')).setDescriptionLocalizations({ 'en-US': 'Remove a ticket type' }).addStringOption((o) => o.setName('name').setDescription(L('x', 'اسم او معرف النوع', 'Type name or id')).setDescriptionLocalizations({ 'en-US': 'Type name or id' }).setRequired(true)))
      .addSubcommand((s) => s.setName('list').setDescription(L('x', 'عرض انواع التذاكر', 'List ticket types')).setDescriptionLocalizations({ 'en-US': 'List ticket types' })))

    .addSubcommand((s) => s.setName('panel').setDescription(L('x', 'ارسال لوحة التذاكر في قناة', 'Send the ticket panel in a channel')).setDescriptionLocalizations({ 'en-US': 'Send the ticket panel in a channel' }).addChannelOption((o) => o.setName('channel').setDescription(L('x', 'القناة', 'Channel')).setDescriptionLocalizations({ 'en-US': 'Channel' }).setRequired(true)))
    .addSubcommand((s) => s.setName('add').setDescription(L('x', 'اضافة عضو للتذكرة', 'Add a member to the ticket')).setDescriptionLocalizations({ 'en-US': 'Add a member to the ticket' }).addUserOption((o) => o.setName('user').setDescription(L('x', 'العضو', 'Member')).setDescriptionLocalizations({ 'en-US': 'Member' }).setRequired(true)))
    .addSubcommand((s) => s.setName('remove').setDescription(L('x', 'ازالة عضو من التذكرة', 'Remove a member from the ticket')).setDescriptionLocalizations({ 'en-US': 'Remove a member from the ticket' }).addUserOption((o) => o.setName('user').setDescription(L('x', 'العضو', 'Member')).setDescriptionLocalizations({ 'en-US': 'Member' }).setRequired(true)))
    .addSubcommand((s) => s.setName('rename').setDescription(L('x', 'اعادة تسمية التذكرة', 'Rename the ticket')).setDescriptionLocalizations({ 'en-US': 'Rename the ticket' }).addStringOption((o) => o.setName('name').setDescription(L('x', 'الاسم الجديد', 'New name')).setDescriptionLocalizations({ 'en-US': 'New name' }).setRequired(true).setMaxLength(50)))
    .addSubcommand((s) => s.setName('claim').setDescription(L('x', 'مطالبة التذكرة', 'Claim the ticket')).setDescriptionLocalizations({ 'en-US': 'Claim the ticket' }))
    .addSubcommand((s) => s.setName('unclaim').setDescription(L('x', 'الغاء المطالبة', 'Unclaim the ticket')).setDescriptionLocalizations({ 'en-US': 'Unclaim the ticket' }))
    .addSubcommand((s) => s.setName('close').setDescription(L('x', 'اغلاق التذكرة', 'Close the ticket')).setDescriptionLocalizations({ 'en-US': 'Close the ticket' }).addStringOption((o) => o.setName('reason').setDescription(L('x', 'السبب (اختياري)', 'Reason (optional)')).setDescriptionLocalizations({ 'en-US': 'Reason (optional)' }).setMaxLength(200)))
    .addSubcommand((s) => s.setName('reopen').setDescription(L('x', 'اعادة فتح التذكرة', 'Reopen the ticket')).setDescriptionLocalizations({ 'en-US': 'Reopen the ticket' }))
    .addSubcommand((s) => s.setName('delete').setDescription(L('x', 'حذف التذكرة نهائيا', 'Delete the ticket permanently')).setDescriptionLocalizations({ 'en-US': 'Delete the ticket permanently' }))
    .addSubcommand((s) => s.setName('transcript').setDescription(L('x', 'حفظ نسخة المحادثة', 'Save the transcript')).setDescriptionLocalizations({ 'en-US': 'Save the transcript' }))
    .addSubcommand((s) => s.setName('list').setDescription(L('x', 'عرض التذاكر المفتوحة', 'List open tickets')).setDescriptionLocalizations({ 'en-US': 'List open tickets' }))
    .setDefaultMemberPermissions(8),

  cooldown: 2000,
  async run(client, interaction) {
    const l = interaction.user.id;
    const sub = interaction.options.getSubcommand(false);
    const group = interaction.options.getSubcommandGroup(false);
    const cfg = T.getConfig(interaction.guild.id);

    if (group === 'setup') return handleSetup(client, interaction, cfg, sub);
    if (group === 'types') return handleTypes(client, interaction, cfg, sub);

    switch (sub) {
      case 'panel':
        return handlePanel(client, interaction, cfg);
      case 'list':
        return handleList(client, interaction, cfg);
    }

    const ticket = T.getTicket(interaction.guild.id, interaction.channel?.id);
    if (!ticket) {
      return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'استخدم هذا الامر داخل قناة تذكرة', 'Use this command inside a ticket channel'))], ephemeral: true });
    }

    switch (sub) {
      case 'add': {
        if (!T.isStaff(interaction.member, cfg) && !T.isParticipant(ticket, interaction.member)) {
          return interaction.reply({ embeds: [errorEmbed(interaction.guild, '⛔', L(l, 'غير مصرح', 'Not allowed'))], ephemeral: true });
        }
        const user = interaction.options.getUser('user');
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);
        if (!member) return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'العضو غير موجود في السيرفر', 'Member not found'))], ephemeral: true });
        const res = await T.addMemberToTicket(interaction.guild, interaction.channel, member)
        if (res.error) return replyError(interaction, res);
        return interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '✅ تم', '✅ Done'), L(l, `تمت اضافة **${user.tag}** للتذكرة`, `Added **${user.tag}** to the ticket`))] });
      }
      case 'remove': {
        if (!T.isStaff(interaction.member, cfg)) {
          return interaction.reply({ embeds: [errorEmbed(interaction.guild, '⛔', L(l, 'غير مصرح — يحتاج رول دعم', 'Not allowed — requires a support role'))], ephemeral: true });
        }
        const user = interaction.options.getUser('user');
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);
        if (!member) return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'العضو غير موجود في السيرفر', 'Member not found'))], ephemeral: true });
        const res = await T.removeMemberFromTicket(interaction.guild, interaction.channel, member);
        if (res.error) return replyError(interaction, res);
        return interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '✅ تم', '✅ Done'), L(l, `تمت ازالة **${user.tag}** من التذكرة`, `Removed **${user.tag}** from the ticket`))] });
      }
      case 'rename': {
        if (!T.isStaff(interaction.member, cfg) && !T.isParticipant(ticket, interaction.member)) {
          return interaction.reply({ embeds: [errorEmbed(interaction.guild, '⛔', L(l, 'غير مصرح', 'Not allowed'))], ephemeral: true });
        }
        const name = interaction.options.getString('name');
        await T.renameTicket(interaction.guild, interaction.channel, name);
        return interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '✅ تم', '✅ Done'), L(l, `تمت اعادة تسمية التذكرة إلى **${name}**`, `Ticket renamed to **${name}**`))] });
      }
      case 'claim': {
        if (!T.isStaff(interaction.member, cfg)) {
          return interaction.reply({ embeds: [errorEmbed(interaction.guild, '⛔', L(l, 'غير مصرح — يحتاج رول دعم', 'Not allowed — requires a support role'))], ephemeral: true });
        }
        const res = await T.claimTicket(interaction.guild, interaction.channel, interaction.member);
        if (res.error) return replyError(interaction, res);
        return interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '✅ تمت المطالبة', '✅ Claimed'), L(l, 'تمت مطالبة التذكرة', 'Ticket claimed'))], ephemeral: true });
      }
      case 'unclaim': {
        if (!T.isStaff(interaction.member, cfg)) {
          return interaction.reply({ embeds: [errorEmbed(interaction.guild, '⛔', L(l, 'غير مصرح — يحتاج رول دعم', 'Not allowed — requires a support role'))], ephemeral: true });
        }
        await T.unclaimTicket(interaction.guild, interaction.channel, interaction.member);
        return interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '✅ تم', '✅ Done'), L(l, 'تم الغاء المطالبة', 'Unclaimed'))], ephemeral: true });
      }
      case 'close': {
        if (!T.isStaff(interaction.member, cfg) && interaction.user.id !== ticket.userId) {
          return interaction.reply({ embeds: [errorEmbed(interaction.guild, '⛔', L(l, 'غير مصرح', 'Not allowed'))], ephemeral: true });
        }
        const reason = interaction.options.getString('reason');
        const res = await T.closeTicket(interaction.guild, interaction.channel, interaction.member, reason);
        if (res.error) return replyError(interaction, res);
        return interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '🔒 اغلق التذكرة', '🔒 Closed'), L(l, 'تم اغلاق التذكرة وارسال نسخة المحادثة', 'Ticket closed and transcript sent'))], ephemeral: true });
      }
      case 'reopen': {
        if (!T.isStaff(interaction.member, cfg)) {
          return interaction.reply({ embeds: [errorEmbed(interaction.guild, '⛔', L(l, 'غير مصرح — يحتاج رول دعم', 'Not allowed — requires a support role'))], ephemeral: true });
        }
        const res = await T.reopenTicket(interaction.guild, interaction.channel, interaction.member);
        if (res.error) return replyError(interaction, res);
        return interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '🔓 اعيد الفتح', '🔓 Reopened'), L(l, 'تمت اعادة فتح التذكرة', 'Ticket reopened'))], ephemeral: true });
      }
      case 'delete': {
        if (!T.isStaff(interaction.member, cfg)) {
          return interaction.reply({ embeds: [errorEmbed(interaction.guild, '⛔', L(l, 'غير مصرح — يحتاج رول دعم', 'Not allowed — requires a support role'))], ephemeral: true });
        }
        const res = await T.deleteTicket(interaction.guild, interaction.channel, interaction.member);
        if (res.error) return replyError(interaction, res);
        return interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '🗑️ تم الحذف', '🗑️ Deleted'), L(l, 'تم حذف التذكرة نهائيا', 'Ticket deleted permanently'))], ephemeral: true });
      }
      case 'transcript': {
        const res = await T.generateTranscript(interaction.guild, interaction.channel);
        if (res.error) return replyError(interaction, res);
        return interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '📄 نسخة المحادثة', '📄 Transcript'), L(l, `تم حفظ **${res.text.split('\n').length}** سطر`, `Saved **${res.text.split('\n').length}** lines`))], files: [res.attachment], ephemeral: true });
      }
    }
  },
};

async function handleSetup(client, interaction, cfg, sub) {
  const l = interaction.user.id;
  if (!isAdmin(interaction)) {
    return interaction.reply({ embeds: [errorEmbed(interaction.guild, '⛔', L(l, 'يحتاج صلاحية Administrator', 'Requires Administrator permission'))], ephemeral: true });
  }
  const { db } = require('../../utils/database');

  if (sub === 'category') {
    const category = interaction.options.getChannel('category');
    cfg.categoryId = category.id;
    T.saveConfig(interaction.guild.id);
    return interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '✅ تم', '✅ Done'), L(l, `كاتيجوري التذاكر: ${category}`, `Ticket category: ${category}`))] });
  }
  if (sub === 'support') {
    const role = interaction.options.getRole('role');
    cfg.supportRoleId = role.id;
    T.saveConfig(interaction.guild.id);
    return interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '✅ تم', '✅ Done'), L(l, `رول الدعم: ${role}`, `Support role: ${role}`))] });
  }
  if (sub === 'log') {
    const channel = interaction.options.getChannel('channel');
    cfg.logChannelId = channel.id;
    T.saveConfig(interaction.guild.id);
    return interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '✅ تم', '✅ Done'), L(l, `قناة نسخ المحادثات: ${channel}`, `Transcript channel: ${channel}`))] });
  }
  if (sub === 'max') {
    const count = interaction.options.getInteger('count');
    cfg.maxPerUser = count;
    T.saveConfig(interaction.guild.id);
    return interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '✅ تم', '✅ Done'), L(l, `الحد الاقصى: **${count}** تذاكر لكل عضو`, `Max: **${count}** tickets per user`))] });
  }
  if (sub === 'status') {
    const category = cfg.categoryId ? `<#${cfg.categoryId}>` : '—';
    const support = cfg.supportRoleId ? `<@&${cfg.supportRoleId}>` : '—';
    const log = cfg.logChannelId ? `<#${cfg.logChannelId}>` : '—';
    return interaction.reply({
      embeds: [embed(interaction.guild, {
        title: L(l, '⚙️ اعدادات التذاكر', '⚙️ Ticket settings'),
        description: [
          `**${L(l, 'الكيتجوري', 'Category')}:** ${category}`,
          `**${L(l, 'رول الدعم', 'Support role')}:** ${support}`,
          `**${L(l, 'قناة النسخ', 'Transcript channel')}:** ${log}`,
          `**${L(l, 'الحد الاقصى', 'Max per user')}:** ${cfg.maxPerUser}`,
          `**${L(l, 'انواع التذاكر', 'Ticket types')}:** ${cfg.types.length}`,
          `**${L(l, 'التذاكر المفتوحة', 'Open tickets')}:** ${Object.values(cfg.tickets).filter((t) => t.status === 'open').length}`,
        ].join('\n'),
      })],
    });
  }
}

async function handleTypes(client, interaction, cfg, sub) {
  const l = interaction.user.id;
  if (!isAdmin(interaction)) {
    return interaction.reply({ embeds: [errorEmbed(interaction.guild, '⛔', L(l, 'يحتاج صلاحية Administrator', 'Requires Administrator permission'))], ephemeral: true });
  }

  if (sub === 'add') {
    const label = interaction.options.getString('label');
    const emoji = interaction.options.getString('emoji');
    const description = interaction.options.getString('description');
    const name = label.toLowerCase().replace(/[^a-z0-9]/gi, '');
    const id = `type_${Date.now().toString(36)}`;
    cfg.types.push({ id, name, label, emoji, description });
    T.saveConfig(interaction.guild.id);
    return interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '✅ تم', '✅ Done'), L(l, `تمت اضافة نوع **${emoji} ${label}**\nارسله بامر \`/ticket panel\``, `Added type **${emoji} ${label}**\nSend the panel with \`/ticket panel\``))] });
  }

  if (sub === 'remove') {
    const name = interaction.options.getString('name').toLowerCase();
    const idx = cfg.types.findIndex((t) => t.id.toLowerCase() === name || t.name.toLowerCase() === name || t.label.toLowerCase() === name);
    if (idx === -1) return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'نوع التذكرة غير موجود', 'Ticket type not found'))], ephemeral: true });
    const [removed] = cfg.types.splice(idx, 1);
    T.saveConfig(interaction.guild.id);
    return interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '✅ تم', '✅ Done'), L(l, `تم حذف النوع **${removed.emoji} ${removed.label}**`, `Removed type **${removed.emoji} ${removed.label}**`))] });
  }

  if (sub === 'list') {
    if (!cfg.types.length) return interaction.reply({ embeds: [embed(interaction.guild, { title: L(l, '📂 انواع التذاكر', '📂 Ticket types'), description: L(l, 'لا توجد انواع بعد — اضفها بـ `/ticket types add`', 'No types yet — add them with `/ticket types add`'), color: 'info' })], ephemeral: true });
    const lines = cfg.types.map((t, i) => `${i + 1}. ${t.emoji} **${t.label}**${t.description ? ` — ${t.description}` : ''}`);
    return interaction.reply({ embeds: [embed(interaction.guild, { title: L(l, '📂 انواع التذاكر', '📂 Ticket types'), description: lines.join('\n') })] });
  }
}

async function handlePanel(client, interaction, cfg) {
  const l = interaction.user.id;
  if (!isAdmin(interaction)) {
    return interaction.reply({ embeds: [errorEmbed(interaction.guild, '⛔', L(l, 'يحتاج صلاحية Administrator', 'Requires Administrator permission'))], ephemeral: true });
  }
  if (!cfg.types.length) {
    return interaction.reply({ embeds: [errorEmbed(interaction.guild, '⚠️', L(l, 'اضف انواع تذاكر اولا عبر `/ticket types add`', 'Add ticket types first via `/ticket types add`'))], ephemeral: true });
  }
  if (!cfg.categoryId) {
    return interaction.reply({ embeds: [errorEmbed(interaction.guild, '⚠️', L(l, 'حدد كاتيجوري التذاكر اولا عبر `/ticket setup category`', 'Set a ticket category first via `/ticket setup category`'))], ephemeral: true });
  }
  const channel = interaction.options.getChannel('channel');
  await channel.send({ embeds: [T.buildPanelEmbed(interaction.guild, cfg.types)], components: T.buildPanelRows(cfg.types) });
  return interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '✅ تم', '✅ Done'), L(l, `تم ارسال لوحة التذاكر في ${channel}`, `Ticket panel sent in ${channel}`))], ephemeral: true });
}

async function handleList(client, interaction, cfg) {
  const l = interaction.user.id;
  const open = Object.values(cfg.tickets).filter((t) => t.status === 'open');
  if (!open.length) return interaction.reply({ embeds: [embed(interaction.guild, { title: L(l, '🎫 التذاكر المفتوحة', '🎫 Open tickets'), description: L(l, 'لا توجد تذاكر مفتوحة', 'No open tickets'), color: 'info' })], ephemeral: true });
  const lines = open.map((t) => {
    const type = T.getType(cfg, t.type);
    return `<#${t.channelId}> — **${type ? type.label : '—'}** — <@${t.userId}>${t.claimedBy ? ` — 🙋 <@${t.claimedBy}>` : ''}`;
  });
  return interaction.reply({ embeds: [embed(interaction.guild, { title: L(l, `🎫 التذاكر المفتوحة (${open.length})`, `🎫 Open tickets (${open.length})`), description: lines.join('\n') })] });
}
