const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { embed } = require('../../utils/embed');
const { getSettings } = require('../../services/logService');
const { formatNumber } = require('../../utils/functions');
const { L } = require('../../utils/i18n');

module.exports = {
  category: 'config',
  descEn: 'Preview the welcome message',
  data: new SlashCommandBuilder()
    .setName('welcometest')
    .setDescription('معاينة رسالة الترحيب')
    .setDescriptionLocalizations({ 'en-US': 'Preview the welcome message' })
    .setDefaultMemberPermissions(8),
  async run(client, interaction) {
    const l = interaction.user.id;
    const settings = getSettings(interaction.guild.id);
    const count = formatNumber(interaction.guild.memberCount);
    const welcome = embed(interaction.guild, {
      title: settings.welcomeMessage ? null : '👋 عضو جديد!',
      description: settings.welcomeMessage
        ? settings.welcomeMessage.replace(/{user}/g, interaction.user.toString()).replace(/{server}/g, interaction.guild.name).replace(/{count}/g, count)
        : `اهلا بك **${interaction.user.tag}** في **${interaction.guild.name}**!\nانت العضو رقم **#${count}**\nاستمتع بوقتك معنا 🎉`,
      thumbnail: interaction.user.displayAvatarURL({ size: 256 }),
      image: settings.welcomeImage || null,
      footer: { text: L(l, 'معاينة — هذه الرسالة ستصل للاعضاء الجدد', 'Preview — this is what new members see') },
    });
    await interaction.reply({ embeds: [welcome] });
  },
};
