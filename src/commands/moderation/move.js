const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { embed, successEmbed, errorEmbed } = require('../../utils/embed');
const { L } = require('../../utils/i18n');

module.exports = {
  category: 'moderation',
  descEn: 'Move a member between voice channels',
  data: new SlashCommandBuilder()
    .setName('move')
    .setDescription('نقل عضو بين الرومات الصوتية')
    .setDescriptionLocalizations({ 'en-US': 'Move a member between voice channels' })
    .setDefaultMemberPermissions(8)
    .addUserOption((o) => o.setName('user').setDescription(L('x', 'العضو', 'Member')).setDescriptionLocalizations({ 'en-US': 'Member' }).setRequired(true))
    .addChannelOption((o) => o.setName('channel').setDescription(L('x', 'الروم الصوتي', 'Voice channel')).setDescriptionLocalizations({ 'en-US': 'Voice channel' }).setRequired(true)),
  botPermissions: [PermissionFlagsBits.MoveMembers],
  async run(client, interaction) {
    const l = interaction.user.id;
    const target = interaction.options.getUser('user');
    const channel = interaction.options.getChannel('channel');
    if (!channel.isVoiceBased()) return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'الرجاء اختيار روم صوتي', 'Please choose a voice channel'))], ephemeral: true });

    const member = await interaction.guild.members.fetch(target.id).catch(() => null);
    if (!member?.voice?.channel) return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'العضو ليس في روم صوتي', 'Member is not in a voice channel'))], ephemeral: true });

    try {
      await member.voice.setChannel(channel);
    } catch {
      return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'فشل نقل العضو', 'Failed to move member'))], ephemeral: true });
    }
    await interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '🔀 تم', '🔀 Done'), L(l, `تم نقل **${target.tag}** الى ${channel}`, `Moved **${target.tag}** to ${channel}`))] });
  },
};
