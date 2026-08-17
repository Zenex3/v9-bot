const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { embed, successEmbed, errorEmbed } = require('../../utils/embed');
const { L } = require('../../utils/i18n');

module.exports = {
  category: 'moderation',
  descEn: 'Set channel slowmode',
  data: new SlashCommandBuilder()
    .setName('slowmode')
    .setDescription('تحديد الوضع البطيء للقناة')
    .setDescriptionLocalizations({ 'en-US': 'Set channel slowmode' })
    .setDefaultMemberPermissions(8)
    .addIntegerOption((o) => o.setName('seconds').setDescription(L('x', 'المدة بالثواني (0 لالغاء)', 'Seconds (0 to disable)')).setDescriptionLocalizations({ 'en-US': 'Seconds (0 to disable)' }).setRequired(true).setMinValue(0).setMaxValue(21600))
    .addChannelOption((o) => o.setName('channel').setDescription(L('x', 'القناة (افتراضي: الحالية)', 'Channel (default: current)')).setDescriptionLocalizations({ 'en-US': 'Channel (default: current)' })),
  botPermissions: [PermissionFlagsBits.ManageChannels],
  async run(client, interaction) {
    const l = interaction.user.id;
    const seconds = interaction.options.getInteger('seconds');
    const channel = interaction.options.getChannel('channel') || interaction.channel;
    try {
      await channel.setRateLimitPerUser(seconds);
    } catch {
      return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'فشل تعيين الوضع البطيء', 'Failed to set slowmode'))], ephemeral: true });
    }
    await interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '🐌 الوضع البطيء', '🐌 Slowmode'), seconds ? L(l, `تم تعيين **${seconds}** ثانية في ${channel}`, `Set **${seconds}** seconds in ${channel}`) : L(l, `تم الغاء الوضع البطيء في ${channel}`, `Slowmode disabled in ${channel}`))] });
  },
};
