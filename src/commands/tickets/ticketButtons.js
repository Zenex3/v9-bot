const { embed, successEmbed, errorEmbed, row, ButtonBuilder, ButtonStyle } = require('../../utils/embed');
const { L } = require('../../utils/i18n');
const T = require('../../services/ticketService');

const ERRORS = {
  not_ticket: ['❌', 'هذه القناة ليست تذكرة', 'This channel is not a ticket'],
  already_closed: ['❌', 'التذكرة مغلقة بالفعل', 'The ticket is already closed'],
  already_open: ['❌', 'التذكرة مفتوحة بالفعل', 'The ticket is already open'],
  not_open: ['❌', 'التذكرة غير مفتوحة', 'The ticket is not open'],
  no_category: ['⚠️', 'لم يحدد المسؤول كاتيجوري التذاكر بعد', 'No ticket category is configured yet'],
  no_type: ['❌', 'نوع التذكرة غير موجود', 'Ticket type not found'],
  max_tickets: ['⚠️', 'وصلت للحد الاقصى من التذاكر المفتوحة', 'You reached the max open tickets limit'],
  duplicate_type: ['⚠️', 'لديك تذكرة مفتوحة من هذا النوع بالفعل', 'You already have an open ticket of this type'],
};

function replyError(interaction, result) {
  const l = interaction.user.id;
  const err = ERRORS[result.error] || ['❌', 'حدث خطا', 'Something went wrong'];
  return interaction.reply({ embeds: [errorEmbed(interaction.guild, err[0], L(l, err[1], err[2]))], ephemeral: true });
}

function deny(interaction, ar = 'غير مصرح', en = 'Not allowed') {
  const l = interaction.user.id;
  return interaction.reply({ embeds: [errorEmbed(interaction.guild, '⛔', L(l, ar, en))], ephemeral: true });
}

module.exports = {
  components: { 'ticket_*': handleTicketButton },
};

async function handleTicketButton(client, interaction) {
    const l = interaction.user.id;
    const id = interaction.customId;

    if (id.startsWith('ticket_open:')) {
      if (!interaction.guild) return;
      const typeId = id.split(':')[1];
      const cfg = T.getConfig(interaction.guild.id);
      const member = interaction.member;
      const res = await T.createTicket(interaction.guild, member, typeId);
      if (res.error) return replyError(interaction, res);
      const type = T.getType(cfg, typeId);
      return interaction.reply({
        embeds: [successEmbed(interaction.guild, L(l, '🎫 تم فتح تذكرتك', '🎫 Your ticket is open'), L(l, `تم فتح تذكرة **${type ? type.label : ''}**\n${res.channel}`, `Opened a **${type ? type.label : ''}** ticket\n${res.channel}`))],
        ephemeral: true,
      });
    }

    const ticket = T.getTicket(interaction.guild?.id, interaction.channel?.id);
    if (!ticket) return deny(interaction, 'هذه القناة ليست تذكرة', 'This channel is not a ticket');
    const cfg = T.getConfig(interaction.guild.id);

    if (id === 'ticket_claim') {
      if (!T.isStaff(interaction.member, cfg)) return deny(interaction, 'غير مصرح — يحتاج رول دعم', 'Not allowed — requires a support role');
      const res = await T.claimTicket(interaction.guild, interaction.channel, interaction.member);
      if (res.error) return replyError(interaction, res);
      return interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '🙋 تمت المطالبة', '🙋 Claimed'), L(l, 'توليت هذه التذكرة', 'You claimed this ticket'))], ephemeral: true });
    }

    if (id === 'ticket_unclaim') {
      if (!T.isStaff(interaction.member, cfg)) return deny(interaction, 'غير مصرح — يحتاج رول دعم', 'Not allowed — requires a support role');
      await T.unclaimTicket(interaction.guild, interaction.channel, interaction.member);
      return interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '✅ تم', '✅ Done'), L(l, 'تم الغاء المطالبة', 'Ticket unclaimed'))], ephemeral: true });
    }

    if (id === 'ticket_close') {
      if (!T.isStaff(interaction.member, cfg) && interaction.user.id !== ticket.userId) return deny(interaction);
      const res = await T.closeTicket(interaction.guild, interaction.channel, interaction.member);
      if (res.error) return replyError(interaction, res);
      return interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '🔒 اغلقت التذكرة', '🔒 Ticket closed'), L(l, 'تم اغلاق التذكرة وارسال نسخة المحادثة', 'Ticket closed and transcript sent'))], ephemeral: true });
    }

    if (id === 'ticket_reopen') {
      if (!T.isStaff(interaction.member, cfg)) return deny(interaction, 'غير مصرح — يحتاج رول دعم', 'Not allowed — requires a support role');
      const res = await T.reopenTicket(interaction.guild, interaction.channel, interaction.member);
      if (res.error) return replyError(interaction, res);
      return interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '🔓 اعيد الفتح', '🔓 Reopened'), L(l, 'تمت اعادة فتح التذكرة', 'Ticket reopened'))], ephemeral: true });
    }

    if (id === 'ticket_transcript') {
      if (!T.isStaff(interaction.member, cfg) && !T.isParticipant(ticket, interaction.member)) return deny(interaction);
      const res = await T.generateTranscript(interaction.guild, interaction.channel);
      if (res.error) return replyError(interaction, res);
      return interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '📄 نسخة المحادثة', '📄 Transcript'), L(l, `تم حفظ **${res.text.split('\n').length}** سطر`, `Saved **${res.text.split('\n').length}** lines`))], files: [res.attachment], ephemeral: true });
    }

    if (id === 'ticket_delete') {
      if (!T.isStaff(interaction.member, cfg)) return deny(interaction, 'غير مصرح — يحتاج رول دعم', 'Not allowed — requires a support role');
      const confirm = new ButtonBuilder().setCustomId('ticket_delete_confirm').setLabel('نعم، احذف').setStyle(ButtonStyle.Danger).setEmoji('🗑️');
      const cancel = new ButtonBuilder().setCustomId('ticket_delete_cancel').setLabel('الغاء').setStyle(ButtonStyle.Secondary).setEmoji('❌');
      return interaction.reply({
        embeds: [embed(interaction.guild, { title: '🗑️ تأكيد الحذف', description: L(l, 'هل انت متأكد من حذف هذه التذكرة نهائيا؟ سيتم حفظ نسخة المحادثة قبل الحذف.', 'Are you sure you want to delete this ticket permanently? A transcript will be saved first.'), color: 'warning' })],
        components: [row(confirm, cancel)],
        ephemeral: true,
      });
    }

    if (id === 'ticket_delete_confirm') {
      if (!T.isStaff(interaction.member, cfg)) return deny(interaction, 'غير مصرح — يحتاج رول دعم', 'Not allowed — requires a support role');
      const res = await T.deleteTicket(interaction.guild, interaction.channel, interaction.member);
      if (res.error) return replyError(interaction, res);
      return interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '🗑️ تم الحذف', '🗑️ Deleted'), L(l, 'تم حذف التذكرة نهائيا', 'Ticket deleted permanently'))], ephemeral: true });
    }

    if (id === 'ticket_delete_cancel') {
      return interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '✅ تم', '✅ Done'), L(l, 'تم الغاء الحذف', 'Deletion cancelled'))], ephemeral: true });
    }

    await interaction.reply({ content: L(l, 'تفاعل غير معروف', 'Unknown interaction'), ephemeral: true });
}
