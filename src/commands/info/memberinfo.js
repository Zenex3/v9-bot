const { SlashCommandBuilder } = require('discord.js');
const { embed, errorEmbed } = require('../../utils/embed');
const { L } = require('../../utils/i18n');

module.exports = {
  category: 'info',
  descEn: 'Member banner and permissions',
  data: new SlashCommandBuilder()
    .setName('memberinfo')
    .setDescription('بانر وصلاحيات العضو')
    .setDescriptionLocalizations({ 'en-US': 'Member banner and permissions' })
    .addSubcommand((s) => s.setName('banner').setDescription(L('x', 'عرض بانر العضو', 'Show member banner')).setDescriptionLocalizations({ 'en-US': 'Show member banner' }).addUserOption((o) => o.setName('user').setDescription(L('x', 'العضو (اختياري)', 'Member (optional)')).setDescriptionLocalizations({ 'en-US': 'Member (optional)' })))
    .addSubcommand((s) => s.setName('permissions').setDescription(L('x', 'عرض صلاحيات العضو', 'Show member permissions')).setDescriptionLocalizations({ 'en-US': 'Show member permissions' }).addUserOption((o) => o.setName('user').setDescription(L('x', 'العضو', 'Member')).setDescriptionLocalizations({ 'en-US': 'Member' }).setRequired(true))),
  cooldown: 3000,
  async run(client, interaction) {
    const l = interaction.user.id;
    const sub = interaction.options.getSubcommand();

    if (sub === 'banner') {
      const user = interaction.options.getUser('user') || interaction.user;
      const fetched = await user.fetch().catch(() => user);
      const banner = fetched.bannerURL({ size: 1024 });
      if (!banner) return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, `${user.tag} ليس لديه بانر`, `${user.tag} has no banner`))], ephemeral: true });
      const bannerEmbed = embed(interaction.guild, {
        title: L(l, `🖼️ بانر`, `🖼️ Banner`),
        description: user.toString(),
        image: banner,
        url: banner,
      });
      return interaction.reply({ embeds: [bannerEmbed] });
    }

    if (sub === 'permissions') {
      const user = interaction.options.getUser('user');
      const member = await interaction.guild.members.fetch(user.id).catch(() => null);
      if (!member) return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'العضو غير موجود', 'Member not found'))], ephemeral: true });
      const all = member.permissions.toArray();
      const key = all.filter((p) => ['Administrator', 'ManageGuild', 'ManageChannels', 'ManageRoles', 'ManageMessages', 'KickMembers', 'BanMembers', 'ModerateMembers', 'DeafenMembers', 'MoveMembers', 'ManageWebhooks', 'ManageNicknames', 'MentionEveryone', 'ManageEvents', 'ViewAuditLog'].includes(p));
      const important = all.filter((p) => !key.includes(p));
      const permEmbed = embed(interaction.guild, {
        title: L(l, `🛡️ صلاحيات`, `🛡️ Permissions`),
        description: `${member.toString()}\n\n${member.permissions.has('Administrator') ? `> ${L(l, '🟢 ادمن كامل — يمتلك كل الصلاحيات', '🟢 Full Administrator — has all permissions')}` : ''}`,
        fields: [
          { name: L(l, '🔑 صلاحيات اساسية', '🔑 Key Permissions'), value: key.length ? key.map((p) => `\`${p}\``).join(' ') : L(l, 'لا يوجد', 'None') },
          { name: L(l, '➕ صلاحيات اخرى', '➕ Other Permissions'), value: important.length ? important.map((p) => `\`${p}\``).join(' ').slice(0, 1024) : L(l, 'لا يوجد', 'None') },
        ],
      });
      return interaction.reply({ embeds: [permEmbed] });
    }
  },
};
