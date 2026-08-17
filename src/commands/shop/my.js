const { SlashCommandBuilder } = require('discord.js');
const { buildSubscriptionEmbed } = require('../../services/shopService');

module.exports = {
  category: 'info',
  descEn: 'Show your subscription and products content',
  data: new SlashCommandBuilder()
    .setName('my')
    .setDescription('عرض اشتراكك ومحتوى كل منتجاتك / View your subscription')
    .setDescriptionLocalizations({ 'en-US': 'View your subscription and products' }),
  async run(client, interaction) {
    await interaction.reply(buildSubscriptionEmbed(interaction.user, interaction.guild));
  },
};
