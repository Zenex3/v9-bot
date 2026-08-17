const { SlashCommandBuilder, StringSelectMenuBuilder, ActionRowBuilder, ComponentType, AttachmentBuilder } = require('discord.js');
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
    .addStringOption((o) => o.setName('message').setDescription('نص الرسالة — الكلام اللي تبيعه للاعضاء').setRequired(true).setMaxLength(2000))
    .addStringOption((o) => o.setName('title').setDescription('عنوان الامبيد (اختياري) حتى لو مسابش بيفضل عنوان جميل').setRequired(false).setMaxLength(80))
    .addStringOption((o) => o.setName('target').setDescription('مين يوصّله').addChoices(
      { name: '👥 كل الاعضاء (خاص لكل واحد)', value: 'all' },
      { name: '👤 عضو واحد', value: 'member' }))
    .addUserOption((o) => o.setName('member').setDescription('العضو اللي تبعتله لو اختارت (عضو واحد)').setRequired(false))
    .setDefaultMemberPermissions(8),
  devOnly: true,
  cooldown: 10000,
  async run(client, interaction) {
    const l = interaction.user.id;
    const message = interaction.options.getString('message');
    const title = interaction.options.getString('title') || L(l, '📢 اعلان من الادارة', '📢 Announcement');
    const target = interaction.options.getString('target') || 'all';
    const member = interaction.options.getUser('member');

    if (target === 'member') {
      if (!member) {
        return interaction.reply({ embeds: [embed(interaction.guild, { title: '❌', description: L(l, 'اختر عضو من خيار (member) عشان ترسل له', 'Choose a member from the (member) option to send to'), color: 'error' })], ephemeral: true });
      }
      const dmEmbed = buildBroadcast(message, title, member, l);
      try {
        const dm = await member.createDM();
        await dm.send({
          embeds: [dmEmbed],
          components: [new ActionRowBuilder().addComponents(
            new (require('discord.js').ButtonBuilder)()
              .setLabel(L(l, '🎟️ اشترك الآن', '🎟️ Subscribe now'))
              .setStyle(require('discord.js').ButtonStyle.Link)
              .setURL('https://discord.gg/KwbNWbHmnH'),
          )],
        });
        return interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '✅ تم الارسال', '✅ Sent'), `${L(l, 'تم ارسال الرسالة إلى', 'Message sent to')} **${member.tag}** (${member})`)] });
      } catch (e) {
        return interaction.reply({ embeds: [embed(interaction.guild, { title: '❌', description: L(l, `تعذر ارسال الخاص إلى ${member.tag} — غالبا مفعّل له الـ DMs مقفول`, `Could not DM ${member.tag} — their DMs are probably closed`), color: 'error' })], ephemeral: true });
      }
    }

    // إرسال لكل الاعضاء عبر DM
    const guild = interaction.guild;
    await interaction.deferReply({ ephemeral: true });
    await guild.members.fetch().catch(() => {});
    const allMembers = guild.members.cache.filter((m) => !m.user.bot);
    let sent = 0, failed = 0, skipped = 0;
    const dmEmbed = buildBroadcast(message, title, null, l);
    const componentRow = [new ActionRowBuilder().addComponents(
      new (require('discord.js').ButtonBuilder)()
        .setLabel(L(l, '🎟️ اشترك الآن', '🎟️ Subscribe now'))
        .setStyle(require('discord.js').ButtonStyle.Link)
        .setURL('https://discord.gg/KwbNWbHmnH'),
    )];

    for (const member of allMembers.values()) {
      try {
        const dm = await member.createDM();
        await dm.send({ embeds: [dmEmbed], components: componentRow });
        sent++;
      } catch {
        failed++;
      }
      await new Promise((r) => setTimeout(r, 250)); // تاكينة لتفادي الرايت ليمت
    }
    const total = allMembers.size;
    skipped = total - sent - failed;
    return interaction.editReply({
      embeds: [embed(interaction.guild, {
        title: '📢 البث', color: 'success',
        description: L(l,
          `تم الارسال ✅\n\n**✓ ارسلت:** ${sent} عضو\n**✗ فشل:** ${failed} عضو\n**⏭️ بدون دخول/بوت:** ${skipped}`,
          `Broadcast done ✅\n\n**✓ Sent:** ${sent} members\n**✗ Failed:** ${failed} members\n**⏭️ Others:** ${skipped}`),
      })],
    });
  },
};

function buildBroadcast(message, title, member, l) {
  const e = embed(null, {
    title,
    description: message,
    color: 'info',
  });
  if (member) {
    e.setAuthor({ name: member.tag, iconURL: member.displayAvatarURL() });
  }
  return e;
}

module.exports.pending = pending;