const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { embed, successEmbed, errorEmbed } = require('../../utils/embed');
const { L } = require('../../utils/i18n');
const T = require('../../services/ticketService');

module.exports = {
  category: 'tickets',
  descEn: 'Send a DM asking the user to come to the ticket',
  data: new SlashCommandBuilder()
    .setName('come')
    .setDescription('يبعت للعضو رسالة خاصة يطلب منه القدوم للقناة/التذكرة')
    .setDescriptionLocalizations({ 'en-US': 'Ask a member to come to the ticket via DM' })
    .addUserOption((o) => o.setName('user').setDescription('العضو المطلوب القدوم').setDescriptionLocalizations({ 'en-US': 'Member to ask' }).setRequired(true))
    .addStringOption((o) => o.setName('reason').setDescription('السبب (اختياري)').setDescriptionLocalizations({ 'en-US': 'Reason (optional)' }).setMaxLength(300))
    .setDefaultMemberPermissions(8),
  async run(client, interaction) {
    const l = interaction.user.id;
    const target = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason');
    const channel = interaction.channel;

    const ticket = T.getTicket(interaction.guild?.id, channel?.id);
    const cfg = T.getConfig(interaction.guild.id);

    if (ticket && !T.isStaff(interaction.member, cfg) && !T.isParticipant(ticket, interaction.member)) {
      return interaction.reply({ embeds: [errorEmbed(interaction.guild, '⛔', L(l, 'غير مصرح', 'Not allowed'))], ephemeral: true });
    }
    if (!ticket && !interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels) && !interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ embeds: [errorEmbed(interaction.guild, '⛔', L(l, 'غير مصرح — يحتاج صلاحية ادارة القنوات او استخدام الامر داخل تذكرة', 'Not allowed — requires Manage Channels or use inside a ticket'))], ephemeral: true });
    }

    const place = channel ? `**${channel}**` : L(l, 'القناة', 'the channel');
    const desc = L(l,
      `السلام عليكم **${target.username}** 👋\n\nبرجاء التوجه إلى ${place}\n\n${reason ? `**السبب:** ${reason}\n\n` : ''}📌 **${interaction.guild.name}**`,
      `Hello **${target.username}** 👋\n\nPlease come to ${place}\n\n${reason ? `**Reason:** ${reason}\n\n` : ''}📌 **${interaction.guild.name}**`);

    try {
      const dm = target.dmChannel || (await target.createDM().catch(() => null));
      if (!dm) throw new Error('dm_closed');
      await dm.send({
        embeds: [embed(interaction.guild, {
          title: L(l, '📍 طلب قدوم', '📍 Come here'),
          description: desc,
          color: 'info',
        })],
      });
    } catch {
      return interaction.reply({
        embeds: [errorEmbed(interaction.guild, '⚠️', L(l,
          `لا استطيع ارسال الخاص لـ **${target.tag}** — الخاص مقفول او لا يوجد سيرفر مشترك مع البوت.\nالمكان: ${place}`,
          `Cannot DM **${target.tag}** — DMs are closed or no shared server with the bot.\nPlace: ${place}`))],
        ephemeral: true,
      });
    }

    await interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '✅ تم ارسال رسالة القدوم', '✅ Come message sent'), L(l, `تم ارسال رسالة للخاص لـ **${target.tag}** يطلب فيها القدوم إلى ${place}`, `A come message was sent to **${target.tag}** asking them to go to ${place}`))] });
  },
};
