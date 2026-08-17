const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { embed, successEmbed, errorEmbed } = require('../../utils/embed');
const { L } = require('../../utils/i18n');

module.exports = {
  category: 'moderation',
  descEn: 'Hide a channel from everyone',
  data: new SlashCommandBuilder()
    .setName('hide')
    .setDescription('اخفاء القناة عن الجميع')
    .setDescriptionLocalizations({ 'en-US': 'Hide a channel from everyone' })
    .setDefaultMemberPermissions(8)
    .addChannelOption((o) => o.setName('channel').setDescription(L('x', 'القناة (افتراضي: الحالية)', 'Channel (default: current)')).setDescriptionLocalizations({ 'en-US': 'Channel (default: current)' })),
  botPermissions: [PermissionFlagsBits.ManageChannels],
  async run(client, interaction) {
    const l = interaction.user.id;
    const channel = interaction.options.getChannel('channel') || interaction.channel;
    try {
      await channel.permissionOverwrites.edit(interaction.guild.id, { ViewChannel: false });
    } catch {
      return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'فشل اخفاء القناة', 'Failed to hide channel'))], ephemeral: true });
    }
    await interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '👁️ تم', '👁️ Done'), L(l, `تم اخفاء القناة ${channel}`, `Channel hidden: ${channel}`))] });
  },
};
