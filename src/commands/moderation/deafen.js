const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { embed, successEmbed, errorEmbed } = require('../../utils/embed');
const { L } = require('../../utils/i18n');

module.exports = {
  category: 'moderation',
  descEn: 'Deafen a member in voice',
  data: new SlashCommandBuilder()
    .setName('deafen')
    .setDescription('اصمات عضو في الروم الصوتي')
    .setDescriptionLocalizations({ 'en-US': 'Deafen a member in voice' })
    .setDefaultMemberPermissions(8)
    .addUserOption((o) => o.setName('user').setDescription(L('x', 'العضو', 'Member')).setDescriptionLocalizations({ 'en-US': 'Member' }).setRequired(true)),
  botPermissions: [PermissionFlagsBits.DeafenMembers],
  async run(client, interaction) {
    const l = interaction.user.id;
    const target = interaction.options.getUser('user');
    const member = await interaction.guild.members.fetch(target.id).catch(() => null);
    if (!member?.voice?.channel) return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'العضو ليس في روم صوتي', 'Member is not in a voice channel'))], ephemeral: true });

    try {
      await member.voice.setDeaf(true);
    } catch {
      return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'فشل الاصمات', 'Failed to deafen member'))], ephemeral: true });
    }
    await interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '🔇 تم', '🔇 Done'), L(l, `تم اصمات **${target.tag}**`, `**${target.tag}** deafened`))] });
  },
};
