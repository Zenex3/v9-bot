const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { embed, successEmbed, errorEmbed } = require('../../utils/embed');
const { hasHigherRole, parseDuration, formatTime } = require('../../utils/functions');
const { sendModLog } = require('../../services/logService');
const { L } = require('../../utils/i18n');

module.exports = {
  category: 'moderation',
  descEn: 'Timeout a member (mute)',
  data: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('اخمات عضو (mute)')
    .setDescriptionLocalizations({ 'en-US': 'Timeout a member (mute)' })
    .setDefaultMemberPermissions(8)
    .addUserOption((o) => o.setName('user').setDescription(L('x', 'العضو', 'Member')).setDescriptionLocalizations({ 'en-US': 'Member' }).setRequired(true))
    .addStringOption((o) => o.setName('duration').setDescription(L('x', 'المدة مثال: 10m, 1h, 1d, 30s', 'Duration e.g. 10m, 1h, 1d, 30s')).setDescriptionLocalizations({ 'en-US': 'Duration e.g. 10m, 1h, 1d, 30s' }).setRequired(true))
    .addStringOption((o) => o.setName('reason').setDescription(L('x', 'السبب (اختياري)', 'Reason (optional)')).setDescriptionLocalizations({ 'en-US': 'Reason (optional)' })),
  botPermissions: [PermissionFlagsBits.ModerateMembers],
  async run(client, interaction) {
    const l = interaction.user.id;
    const target = interaction.options.getUser('user');
    const duration = parseDuration(interaction.options.getString('duration'));
    const reason = interaction.options.getString('reason') || L(l, 'غير محدد', 'Not specified');

    if (!duration) {
      return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'مدة غير صالحة (مثال: 10m, 1h, 1d)', 'Invalid duration (e.g. 10m, 1h, 1d)'))], ephemeral: true });
    }
    if (duration < 60000) {
      return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'الحد الادنى للاخمات دقيقة واحدة', 'Minimum timeout is 1 minute'))], ephemeral: true });
    }
    if (duration > 28 * 86400000) {
      return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'مدة غير صالحة (الحد الاقصى 28 يوم)', 'Invalid duration (max 28 days)'))], ephemeral: true });
    }

    const [member, executor, botMember] = await Promise.all([
      interaction.guild.members.fetch(target.id).catch(() => null),
      interaction.member.fetch().catch(() => interaction.member),
      interaction.guild.members.fetchMe().catch(() => interaction.guild.members.me),
    ]);
    if (!member) return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'العضو غير موجود', 'Member not found'))], ephemeral: true });
    if (member.id === interaction.user.id) {
      return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'لا يمكنك اخمات نفسك', 'You cannot timeout yourself'))], ephemeral: true });
    }
    if (member.id === interaction.guild.ownerId) {
      return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'لا يمكنك اخمات صاحب السيرفر', 'You cannot timeout the server owner'))], ephemeral: true });
    }
    if (member.user.bot) {
      return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'لا يمكنك اخمات البوتات', 'You cannot timeout bots'))], ephemeral: true });
    }
    if (member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'لا يمكنك اخمات هذا العضو — ديسكورد يمنع اخمات من يملك صلاحية **Administrator**', 'This member cannot be timed out — Discord forbids timing out members with the **Administrator** permission'))], ephemeral: true });
    }
    if (!botMember || !hasHigherRole(botMember, member)) {
      return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'رول البوت تحت رول هذا العضو — ارفع رول البوت اعلى الرولات الاخرى (اعدام الصلاحيات لا يكفي)', 'Bot role is below this member role — move the bot role above other roles (perms alone are not enough)'))], ephemeral: true });
    }
    const isOwnerOrAdmin = executor.id === interaction.guild.ownerId || executor.permissions.has(PermissionFlagsBits.Administrator);
    if (!isOwnerOrAdmin && !hasHigherRole(executor, member)) {
      return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'رولك تحت رول هذا العضو', 'Your role is below this member role'))], ephemeral: true });
    }

    try {
      await member.timeout(duration, reason);
    } catch (e) {
      if (e.code === 50013) {
        return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'تعذر اخمات هذا العضو — ديسكورد يمنع اخمات من يملك **Administrator** أو رول أعلى من رول البوت', 'Cannot timeout this member — Discord forbids timing out members with **Administrator** or a role above the bot role'))], ephemeral: true });
      }
      return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, `فشل اخمات العضو: ${e.message}`, `Failed to timeout member: ${e.message}`))], ephemeral: true });
    }

    await interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '🔇 تم الاخمات', '🔇 Timed out'), L(l, `**${target.tag}** اخمات لمدة **${formatTime(duration)}**\n**السبب:** ${reason}`, `**${target.tag}** timed out for **${formatTime(duration)}**\n**Reason:** ${reason}`))] });
    await sendModLog(interaction.guild, embed(interaction.guild, { title: L(l, '🔇 اخمات', '🔇 Timeout'), description: L(l, `**العضو:** ${target.tag}\n**بواسطة:** ${interaction.user.tag}\n**المدة:** ${formatTime(duration)}\n**السبب:** ${reason}`, `**Member:** ${target.tag}\n**By:** ${interaction.user.tag}\n**Duration:** ${formatTime(duration)}\n**Reason:** ${reason}`), color: 'warning' }));
  },
};
