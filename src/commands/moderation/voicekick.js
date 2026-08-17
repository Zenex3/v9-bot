const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { embed, successEmbed, errorEmbed } = require('../../utils/embed');
const { sendModLog } = require('../../services/logService');
const { L } = require('../../utils/i18n');

module.exports = {
  category: 'moderation',
  descEn: 'Disconnect a member from voice',
  data: new SlashCommandBuilder()
    .setName('voicekick')
    .setDescription('طرد عضو من الروم الصوتي')
    .setDescriptionLocalizations({ 'en-US': 'Disconnect a member from voice' })
    .setDefaultMemberPermissions(8)
    .addUserOption((o) => o.setName('user').setDescription(L('x', 'العضو', 'Member')).setDescriptionLocalizations({ 'en-US': 'Member' }).setRequired(true)),
  botPermissions: [PermissionFlagsBits.MoveMembers],
  async run(client, interaction) {
    const l = interaction.user.id;
    const target = interaction.options.getUser('user');
    const member = await interaction.guild.members.fetch(target.id).catch(() => null);
    if (!member?.voice?.channel) return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'العضو ليس في روم صوتي', 'Member is not in a voice channel'))], ephemeral: true });

    try {
      await member.voice.disconnect('VoiceKick');
    } catch {
      return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'فشل طرد العضو', 'Failed to disconnect member'))], ephemeral: true });
    }
    await interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '👢 تم', '👢 Done'), L(l, `تم طرد **${target.tag}** من الروم الصوتي`, `**${target.tag}** disconnected from voice`))] });
    await sendModLog(interaction.guild, embed(interaction.guild, { title: L(l, '👢 طرد صوتي', '👢 Voice kick'), description: L(l, `**${target.tag}** طرد من الروم الصوتي بواسطة ${interaction.user.tag}`, `**${target.tag}** disconnected from voice by ${interaction.user.tag}`) }));
  },
};
