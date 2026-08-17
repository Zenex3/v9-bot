const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { embed, successEmbed, errorEmbed } = require('../../utils/embed');
const { L } = require('../../utils/i18n');

module.exports = {
  category: 'moderation',
  descEn: 'Unlock a channel',
  data: new SlashCommandBuilder()
    .setName('unlock')
    .setDescription('فتح القناة')
    .setDescriptionLocalizations({ 'en-US': 'Unlock a channel' })
    .setDefaultMemberPermissions(8)
    .addChannelOption((o) => o.setName('channel').setDescription(L('x', 'القناة (افتراضي: الحالية)', 'Channel (default: current)')).setDescriptionLocalizations({ 'en-US': 'Channel (default: current)' })),
  botPermissions: [PermissionFlagsBits.ManageChannels],
  async run(client, interaction) {
    const l = interaction.user.id;
    const channel = interaction.options.getChannel('channel') || interaction.channel;
    try {
      await channel.permissionOverwrites.edit(interaction.guild.id, { SendMessages: null });
    } catch {
      return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'فشل فتح القناة', 'Failed to unlock channel'))], ephemeral: true });
    }
    await interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '🔓 تم الفتح', '🔓 Unlocked'), L(l, `تم فتح القناة ${channel}`, `Channel unlocked: ${channel}`))] });
  },
};
