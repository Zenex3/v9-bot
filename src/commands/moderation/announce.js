const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { embed, errorEmbed } = require('../../utils/embed');
const { L } = require('../../utils/i18n');

module.exports = {
  category: 'moderation',
  descEn: 'Send an announcement',
  data: new SlashCommandBuilder()
    .setName('announce')
    .setDescription('إرسال إعلان')
    .setDescriptionLocalizations({ 'en-US': 'Send an announcement' })
    .setDefaultMemberPermissions(8)
    .addStringOption((o) => o.setName('title').setDescription(L('x', 'عنوان الإعلان', 'Announcement title')).setDescriptionLocalizations({ 'en-US': 'Announcement title' }).setRequired(true))
    .addStringOption((o) => o.setName('description').setDescription(L('x', 'نص الإعلان', 'Announcement content')).setDescriptionLocalizations({ 'en-US': 'Announcement content' }).setRequired(true))
    .addChannelOption((o) => o.setName('channel').setDescription(L('x', 'القناة (اختياري)', 'Channel (optional)')).setDescriptionLocalizations({ 'en-US': 'Channel (optional)' }).addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
    .addStringOption((o) => o.setName('footer').setDescription(L('x', 'تذييل (اختياري)', 'Footer (optional)')).setDescriptionLocalizations({ 'en-US': 'Footer (optional)' })),
  async run(client, interaction) {
    const l = interaction.user.id;
    const title = interaction.options.getString('title');
    const desc = interaction.options.getString('description');
    const channel = interaction.options.getChannel('channel') || interaction.channel;
    const footer = interaction.options.getString('footer') || null;

    const annEmbed = embed(interaction.guild, {
      title: `📢 ${title}`,
      description: desc,
      author: { name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() },
      footer: footer ? { text: footer } : null,
    });

    if (channel.id !== interaction.channel.id) {
      await channel.send({ embeds: [annEmbed] }).catch(() => null);
      return interaction.reply({ embeds: [embed(interaction.guild, { title: '✅', description: L(l, `تم إرسال الإعلان إلى ${channel}`, `Announcement sent to ${channel}`), color: 'success' })], ephemeral: true });
    }
    await interaction.reply({ embeds: [annEmbed] });
  },
};
