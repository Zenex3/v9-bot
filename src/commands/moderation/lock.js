const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { embed, successEmbed, errorEmbed } = require('../../utils/embed');
const { L } = require('../../utils/i18n');

module.exports = {
  category: 'moderation',
  descEn: 'Lock a channel',
  data: new SlashCommandBuilder()
    .setName('lock')
    .setDescription('قفل القناة')
    .setDescriptionLocalizations({ 'en-US': 'Lock a channel' })
    .setDefaultMemberPermissions(8)
    .addChannelOption((o) => o.setName('channel').setDescription(L('x', 'القناة (افتراضي: الحالية)', 'Channel (default: current)')).setDescriptionLocalizations({ 'en-US': 'Channel (default: current)' })),
  botPermissions: [PermissionFlagsBits.ManageChannels],
  async run(client, interaction) {
    const l = interaction.user.id;
    const channel = interaction.options.getChannel('channel') || interaction.channel;
    try {
      await channel.permissionOverwrites.edit(interaction.guild.id, { SendMessages: false });
    } catch {
      return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'فشل قفل القناة', 'Failed to lock channel'))], ephemeral: true });
    }
    await interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '🔒 تم القفل', '🔒 Locked'), L(l, `تم قفل القناة ${channel}`, `Channel locked: ${channel}`))] });
  },
};
