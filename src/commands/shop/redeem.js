const { SlashCommandBuilder } = require('discord.js');
const { redeemSerial } = require('../../services/shopService');

module.exports = {
  category: 'info',
  descEn: 'Redeem a product serial key',
  data: new SlashCommandBuilder()
    .setName('redeem')
    .setDescription('تفعيل سيريال اشتراك')
    .setDescriptionLocalizations({ 'en-US': 'Redeem a subscription serial key' })
    .addStringOption((o) => o.setName('serial').setDescription('السيريال — مثال: V9-XXXXX-XXXXX-XXXXX').setRequired(true)),
  async run(client, interaction) {
    const key = interaction.options.getString('serial');
    const result = await redeemSerial(client, interaction.user, key);
    await interaction.reply({ embeds: [result.embed], ephemeral: true });
  },
};
