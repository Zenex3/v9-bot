const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { embed, successEmbed, errorEmbed } = require('../../utils/embed');
const { L } = require('../../utils/i18n');

module.exports = {
  category: 'moderation',
  descEn: 'Show a channel to everyone',
  data: new SlashCommandBuilder()
    .setName('unhide')
    .setDescription('اظهار القناة للجميع')
    .setDescriptionLocalizations({ 'en-US': 'Show a channel to everyone' })
    .setDefaultMemberPermissions(8)
    .addChannelOption((o) => o.setName('channel').setDescription(L('x', 'القناة (افتراضي: الحالية)', 'Channel (default: current)')).setDescriptionLocalizations({ 'en-US': 'Channel (default: current)' })),
  botPermissions: [PermissionFlagsBits.ManageChannels],
  async run(client, interaction) {
    const l = interaction.user.id;
    const channel = interaction.options.getChannel('channel') || interaction.channel;
    try {
      await channel.permissionOverwrites.edit(interaction.guild.id, { ViewChannel: null });
    } catch {
      return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'فشل اظهار القناة', 'Failed to show channel'))], ephemeral: true });
    }
    await interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '👁️ تم', '👁️ Done'), L(l, `تم اظهار القناة ${channel}`, `Channel shown: ${channel}`))] });
  },
};
