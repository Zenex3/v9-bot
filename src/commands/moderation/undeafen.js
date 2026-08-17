const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { embed, successEmbed, errorEmbed } = require('../../utils/embed');
const { L } = require('../../utils/i18n');

module.exports = {
  category: 'moderation',
  descEn: 'Undeafen a member',
  data: new SlashCommandBuilder()
    .setName('undeafen')
    .setDescription('فك الاصمات عن عضو')
    .setDescriptionLocalizations({ 'en-US': 'Undeafen a member' })
    .setDefaultMemberPermissions(8)
    .addUserOption((o) => o.setName('user').setDescription(L('x', 'العضو', 'Member')).setDescriptionLocalizations({ 'en-US': 'Member' }).setRequired(true)),
  botPermissions: [PermissionFlagsBits.DeafenMembers],
  async run(client, interaction) {
    const l = interaction.user.id;
    const target = interaction.options.getUser('user');
    const member = await interaction.guild.members.fetch(target.id).catch(() => null);
    if (!member?.voice?.channel) return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'العضو ليس في روم صوتي', 'Member is not in a voice channel'))], ephemeral: true });

    try {
      await member.voice.setDeaf(false);
    } catch {
      return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'فشل فك الاصمات', 'Failed to undeafen member'))], ephemeral: true });
    }
    await interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '🔊 تم', '🔊 Done'), L(l, `تم فك الاصمات عن **${target.tag}**`, `**${target.tag}** undeafened`))] });
  },
};
