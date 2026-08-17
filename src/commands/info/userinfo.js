const { SlashCommandBuilder } = require('discord.js');
const { embed } = require('../../utils/embed');
const { L } = require('../../utils/i18n');

module.exports = {
  category: 'info',
  descEn: 'Member information',
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('معلومات عن عضو')
    .setDescriptionLocalizations({ 'en-US': 'Member information' })
    .addUserOption((o) => o.setName('user').setDescription(L('x', 'العضو (اختياري)', 'Member (optional)')).setDescriptionLocalizations({ 'en-US': 'Member (optional)' })),
  cooldown: 5000,
  async run(client, interaction) {
    const l = interaction.user.id;
    const user = interaction.options.getUser('user') || interaction.user;
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    const roles = member?.roles?.cache
      ?.filter((r) => r.id !== interaction.guild.id)
      .sort((a, b) => b.position - a.position)
      .map((r) => r.toString())
      .slice(0, 15) || [];

    const infoEmbed = embed(interaction.guild, {
      title: `${L(l, 'ℹ️ معلومات', 'ℹ️ Info')} ${user.tag}`,
      thumbnail: user.displayAvatarURL({ size: 256 }),
      fields: [
        { name: L(l, '📛 الاسم', '📛 Name'), value: user.tag, inline: true },
        { name: '🆔 ID', value: user.id, inline: true },
        { name: L(l, '🤖 بوت', '🤖 Bot'), value: user.bot ? L(l, 'نعم', 'Yes') : L(l, 'لا', 'No'), inline: true },
        { name: L(l, '📅 أُنشئ الحساب', '📅 Account created'), value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
        ...(member && member.joinedAt ? [{ name: L(l, '📥 انضم للسيرفر', '📥 Joined server'), value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true }] : []),
        ...(member?.presence ? [{ name: L(l, '🟢 الحالة', '🟢 Status'), value: String(member.presence.status), inline: true }] : []),
        ...(roles.length ? [{ name: `${L(l, '🎭 الأدوار', '🎭 Roles')} (${roles.length})`, value: roles.join(' ').slice(0, 1024) }] : []),
      ],
    });
    await interaction.reply({ embeds: [infoEmbed] });
  },
};
