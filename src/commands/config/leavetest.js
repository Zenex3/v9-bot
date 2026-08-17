const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { embed } = require('../../utils/embed');
const { getSettings } = require('../../services/logService');
const { formatNumber } = require('../../utils/functions');
const { L } = require('../../utils/i18n');

module.exports = {
  category: 'config',
  descEn: 'Preview the leave message',
  data: new SlashCommandBuilder()
    .setName('leavetest')
    .setDescription('معاينة رسالة الوداع')
    .setDescriptionLocalizations({ 'en-US': 'Preview the leave message' })
    .setDefaultMemberPermissions(8),
  async run(client, interaction) {
    const l = interaction.user.id;
    const settings = getSettings(interaction.guild.id);
    const count = formatNumber(interaction.guild.memberCount);
    const leave = embed(interaction.guild, {
      title: settings.leaveMessage ? null : '👋 وداعا',
      description: settings.leaveMessage
        ? settings.leaveMessage.replace(/{user}/g, interaction.user.toString()).replace(/{server}/g, interaction.guild.name).replace(/{count}/g, count)
        : `**${interaction.user.tag}** غادر السيرفر\nنتمنى ان ترجع قريبا 🥲`,
      thumbnail: interaction.user.displayAvatarURL({ size: 256 }),
      image: settings.leaveImage || null,
      footer: { text: L(l, 'معاينة — هذه الرسالة ستصل عند المغادرة', 'Preview — this is what shows when someone leaves') },
    });
    await interaction.reply({ embeds: [leave] });
  },
};
