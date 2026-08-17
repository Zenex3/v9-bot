const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { L } = require('../../utils/i18n');
const { embed, successEmbed } = require('../../utils/embed');

const pending = new Map();

module.exports = {
  category: 'owner',
  descEn: 'Send a nice embed message to all members or a single member (developer only)',
  data: new SlashCommandBuilder()
    .setName('broadcast')
    .setDescription('ارسال اعلان (مطور فقط)')
    .setDescriptionLocalizations({ 'en-US': 'Send an announcement (developer only)' })
    .setDefaultMemberPermissions(8),
  devOnly: true,
  cooldown: 10000,
  async run(client, interaction) {
    const l = interaction.user.id;

    const messageInput = new TextInputBuilder()
      .setCustomId('broadcast_message')
      .setLabel(L(l, 'نص الرسالة — الكلام اللي تبيعه للاعضاء', 'Message text — what you want to send'))
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true)
      .setMaxLength(2000);
    const titleInput = new TextInputBuilder()
      .setCustomId('broadcast_title')
      .setLabel(L(l, 'عنوان الامبيد (اختياري)', 'Embed title (optional)'))
      .setStyle(TextInputStyle.Short)
      .setRequired(false)
      .setMaxLength(80);
    const targetInput = new TextInputBuilder()
      .setCustomId('broadcast_target')
      .setLabel(L(l, 'الي مين؟ (all = الجميع / member = عضو واحد + الادنى)', 'Target? (all / member)'))
      .setStyle(TextInputStyle.Short)
      .setRequired(false)
      .setMaxLength(20)
      .setValue('all');
    const memberInput = new TextInputBuilder()
      .setCustomId('broadcast_member')
      .setLabel(L(l, 'ايدي العضو لو اخترت member (اختياري)', 'Member ID if target = member (optional)'))
      .setStyle(TextInputStyle.Short)
      .setRequired(false)
      .setMaxLength(30);

    const modal = new ModalBuilder()
      .setCustomId('broadcast_modal')
      .setTitle('📢 ارسال اعلان')
      .addComponents(
        new ActionRowBuilder().addComponents(titleInput),
        new ActionRowBuilder().addComponents(messageInput),
        new ActionRowBuilder().addComponents(targetInput),
        new ActionRowBuilder().addComponents(memberInput),
      );
    return interaction.showModal(modal);
  },
};

async function handleModal(client, interaction) {
  const l = interaction.user.id;
  const message = interaction.fields.getTextInputValue('broadcast_message')?.trim();
  const title = interaction.fields.getTextInputValue('broadcast_title')?.trim() || L(l, '📢 اعلان من الادارة', '📢 Announcement');
  const target = (interaction.fields.getTextInputValue('broadcast_target')?.trim() || 'all').toLowerCase();
  const memberId = interaction.fields.getTextInputValue('broadcast_member')?.trim();

  if (!message) {
    return interaction.reply({ embeds: [embed(interaction.guild, { title: '❌', description: L(l, 'اكتب رسالة اولا', 'Write a message first'), color: 'error' })], ephemeral: true });
  }

  const joinBtn = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel(L(l, '🎟️ اشترك الآن', '🎟️ Subscribe now'))
      .setStyle(ButtonStyle.Link)
      .setURL('https://discord.gg/KwbNWbHmnH'),
  );

  if (target === 'member' && memberId) {
    const user = await client.users.fetch(memberId).catch(() => null);
    if (!user) {
      return interaction.reply({ embeds: [embed(interaction.guild, { title: '❌', description: L(l, 'العضو غير موجود', 'Member not found') }, { color: 'error' })], ephemeral: true });
    }
    const dmEmbed = buildBroadcast(message, title, user, l);
    try {
      const dm = await user.createDM();
      await dm.send({ embeds: [dmEmbed], components: [joinBtn] });
      return interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '✅ تم الارسال', '✅ Sent'), `${L(l, 'تم ارسال الرسالة إلى', 'Message sent to')} **${user.tag}** (${user})`)] });
    } catch (e) {
      return interaction.reply({ embeds: [embed(interaction.guild, { title: '❌', description: L(l, `تعذر ارسال الخاص إلى ${user.tag} — غالبا مفعّل له الـ DMs مقفول`, `Could not DM ${user.tag} — their DMs are probably closed`), color: 'error' })], ephemeral: true });
    }
  }

  // إرسال لكل الاعضاء عبر DM
  const guild = interaction.guild;
  await interaction.deferReply({ ephemeral: true });
  await guild.members.fetch().catch(() => {});
  const allMembers = guild.members.cache.filter((m) => !m.user.bot);
  let sent = 0, failed = 0;
  const dmEmbed = buildBroadcast(message, title, null, l);

  for (const member of allMembers.values()) {
    try {
      const dm = await member.createDM();
      await dm.send({ embeds: [dmEmbed], components: [joinBtn] });
      sent++;
    } catch {
      failed++;
    }
    await new Promise((r) => setTimeout(r, 250)); // تاكينة لتفادي الرايت ليمت
  }
  return interaction.editReply({
    embeds: [embed(interaction.guild, {
      title: '📢 البث', color: 'success',
      description: L(l,
        `تم الارسال ✅\n\n**✓ ارسلت:** ${sent} عضو\n**✗ فشل:** ${failed} عضو\n**المجموع:** ${allMembers.size} عضو`,
        `Broadcast done ✅\n\n**✓ Sent:** ${sent} members\n**✗ Failed:** ${failed} members\n**Total:** ${allMembers.size} members`),
    })],
  });
}

function buildBroadcast(message, title, member, l) {
  const e = embed(null, { title, description: message, color: 'info' });
  if (member) {
    e.setAuthor({ name: member.tag, iconURL: member.displayAvatarURL() });
  }
  return e;
}

module.exports.pending = pending;
module.exports.components = {
  'broadcast_modal': handleModal,
};