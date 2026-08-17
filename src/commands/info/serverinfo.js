const { SlashCommandBuilder } = require('discord.js');
const { embed } = require('../../utils/embed');
const { formatNumber, formatDate } = require('../../utils/functions');
const { L } = require('../../utils/i18n');

module.exports = {
  category: 'info',
  descEn: 'Server information and icon',
  data: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('معلومات السيرفر وصورته')
    .setDescriptionLocalizations({ 'en-US': 'Server information and icon' })
    .addSubcommand((s) => s.setName('general').setDescription(L('x', 'معلومات عامة', 'General info')).setDescriptionLocalizations({ 'en-US': 'General info' }))
    .addSubcommand((s) => s.setName('icon').setDescription(L('x', 'صورة السيرفر', 'Server icon')).setDescriptionLocalizations({ 'en-US': 'Server icon' })),
  cooldown: 5000,
  async run(client, interaction) {
    const g = interaction.guild;
    const l = interaction.user.id;
    const sub = interaction.options.getSubcommand();

    if (sub === 'icon') {
      const icon = g.iconURL({ size: 1024, extension: 'png' });
      if (!icon) return interaction.reply({ embeds: [embed(g, { title: L(l, '🖼️ صورة السيرفر', '🖼️ Server Icon'), description: L(l, 'السيرفر ليس لديه صورة', 'This server has no icon'), color: 'error' })], ephemeral: true });
      return interaction.reply({ embeds: [embed(g, { title: L(l, '🖼️ صورة السيرفر', '🖼️ Server Icon'), image: icon, url: icon })] });
    }

    const owner = await g.fetchOwner().catch(() => null);
    const infoEmbed = embed(g, {
      title: `${L(l, 'ℹ️ معلومات', 'ℹ️ Info')} ${g.name}`,
      thumbnail: g.iconURL({ size: 256 }),
      fields: [
        { name: L(l, '📛 الاسم', '📛 Name'), value: g.name, inline: true },
        { name: '🆔 ID', value: g.id, inline: true },
        { name: L(l, '👑 المالك', '👑 Owner'), value: owner ? owner.toString() : L(l, 'غير معروف', 'Unknown'), inline: true },
        { name: L(l, '👥 الأعضاء', '👥 Members'), value: `**${L(l, 'الكل', 'Total')}:** ${formatNumber(g.memberCount)}\n**${L(l, 'الأعضاء', 'Users')}:** ${formatNumber(g.members.cache.filter((m) => !m.user.bot).size)}\n**${L(l, 'بوتات', 'Bots')}:** ${formatNumber(g.members.cache.filter((m) => m.user.bot).size)}`, inline: true },
        { name: L(l, '📚 القنوات', '📚 Channels'), value: `**${L(l, 'نصية', 'Text')}:** ${formatNumber(g.channels.cache.filter((c) => c.isTextBased()).size)}\n**${L(l, 'صوتية', 'Voice')}:** ${formatNumber(g.channels.cache.filter((c) => c.isVoiceBased()).size)}`, inline: true },
        { name: L(l, '🎭 الأدوار', '🎭 Roles'), value: formatNumber(g.roles.cache.size), inline: true },
        { name: L(l, '🚀 البوستات', '🚀 Boosts'), value: formatNumber(g.premiumSubscriptionCount || 0), inline: true },
        { name: L(l, '📅 أُنشئ', '📅 Created'), value: formatDate(g.createdAt), inline: true },
        { name: L(l, '✅ التحقق', '✅ Verification'), value: g.verificationLevel ? L(l, 'منشط', 'Enabled') : L(l, 'غير منشط', 'Disabled'), inline: true },
      ],
    });
    await interaction.reply({ embeds: [infoEmbed] });
  },
};
