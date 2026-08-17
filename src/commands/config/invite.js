const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { embed, successEmbed, errorEmbed } = require('../../utils/embed');
const { t } = require('../../utils/i18n');
const tracker = require('../../services/inviteTracker');

module.exports = {
  category: 'config',
  descEn: 'Invite tracking — see who invited the most members',
  data: new SlashCommandBuilder()
    .setName('invite')
    .setDescription('تتبع الانفايتات — مين جاب اكتر عضو')
    .setDescriptionLocalizations({ 'en-US': 'Invite tracking — see who invited the most members' })
    .addSubcommand((s) => s
      .setName('stats')
      .setDescription('إحصائيات الانفايتات')
      .setDescriptionLocalizations({ 'en-US': 'Your invite stats' })
      .addUserOption((o) => o.setName('user').setDescription('عضو (اختياري)').setDescriptionLocalizations({ 'en-US': 'Member (optional)' })))
    .addSubcommand((s) => s
      .setName('leaderboard')
      .setDescription('لوحة الترتيب')
      .setDescriptionLocalizations({ 'en-US': 'Invite leaderboard' }))
    .addSubcommand((s) => s
      .setName('reset')
      .setDescription('اعادة ضبط الانفايتات (ادارة)')
      .setDescriptionLocalizations({ 'en-US': 'Reset invite counts (admin)' })
      .addUserOption((o) => o.setName('user').setDescription('عضو معين (اترك فاضي للكل)').setDescriptionLocalizations({ 'en-US': 'Specific member (leave empty for all)' }))
    )
    .setDefaultMemberPermissions(8),
  async run(client, interaction) {
    const l = interaction.user.id;
    const guild = interaction.guild;
    const sub = interaction.options.getSubcommand();

    if (sub === 'stats') {
      const target = interaction.options.getUser('user') || interaction.user;
      const total = tracker.getUserInvites(guild.id)[target.id] || 0;
      const breakdown = tracker.getUserInviteBreakdown(guild.id, target.id);
      const fakeCount = breakdown.filter((d) => d.maxUses === 1 && d.maxAge === 0).length;
      const normalCount = breakdown.length - fakeCount;

      return interaction.reply({
        embeds: [embed(guild, {
          title: t(l, 'invite_stats_title'),
          description: [
            `**${target.tag}**`,
            `**${t(l, 'invite_total')}:** ${total}`,
            `**${t(l, 'invite_normal')}:** ${normalCount}`,
            `**${t(l, 'invite_fake')}:** ${fakeCount}`,
          ].join('\n'),
          thumbnail: target.displayAvatarURL({ size: 128 }),
          color: 'info',
        })],
      });
    }

    if (sub === 'leaderboard') {
      const all = tracker.getUserInvites(guild.id);
      const sorted = Object.entries(all).sort((a, b) => b[1] - a[1]).slice(0, 15);
      if (!sorted.length) {
        return interaction.reply({ embeds: [embed(guild, { title: t(l, 'invite_lb_title'), description: t(l, 'invite_no_data'), color: 'info' })] });
      }
      const lines = [];
      for (let i = 0; i < sorted.length; i++) {
        const [userId, count] = sorted[i];
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `**#${i + 1}**`;
        lines.push(`${medal} <@${userId}> — **${count}** ${t(l, 'invite_joins')}`);
      }
      return interaction.reply({
        embeds: [embed(guild, { title: t(l, 'invite_lb_title'), description: lines.join('\n'), color: 'info' })],
      });
    }

    if (sub === 'reset') {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
        return interaction.reply({ embeds: [errorEmbed(guild, t(l, 'no_permission'), t(l, 'ref_unauthorized'))], ephemeral: true });
      }
      const target = interaction.options.getUser('user');
      if (target) {
        const count = tracker.resetUser(guild.id, target.id);
        return interaction.reply({ embeds: [successEmbed(guild, t(l, 'invite_reset_title'), t(l, 'invite_reset_user', target.tag, count))] });
      } else {
        const count = tracker.resetAll(guild.id);
        return interaction.reply({ embeds: [successEmbed(guild, t(l, 'invite_reset_title'), t(l, 'invite_reset_all', count))] });
      }
    }
  },
};
