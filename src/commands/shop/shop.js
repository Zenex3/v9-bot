const { SlashCommandBuilder } = require('discord.js');
const { buildShopMenu, buildCategoryEmbed, buildProductDetail, buildSubscriptionEmbed } = require('../../services/shopService');

module.exports = {
  category: 'info',
  descEn: 'Show the shop products menu',
  data: new SlashCommandBuilder()
    .setName('shop')
    .setDescription('عرض منتجات المتجر مقسمة لفئات / Show shop products')
    .setDescriptionLocalizations({ 'en-US': 'Show shop products by category' }),
  async run(client, interaction) {
    await interaction.reply(buildShopMenu(interaction.user, interaction.guild));
  },
};

async function handleShopButton(client, interaction) {
  const id = interaction.customId;

  if (id === 'shop_back') {
    return interaction.update(buildShopMenu(interaction.user, interaction.guild));
  }
  if (id === 'shop_my') {
    return interaction.update(buildSubscriptionEmbed(interaction.user, interaction.guild));
  }
  if (id === 'shop_prod') {
    const pid = interaction.values[0];
    return interaction.update(buildProductDetail(interaction.user, pid, interaction.guild));
  }
  if (id.startsWith('shop_cat_')) {
    const cat = id.slice('shop_cat_'.length);
    return interaction.update(buildCategoryEmbed(interaction.user, cat, interaction.guild));
  }
  return interaction.deferUpdate().catch(() => {});
}

module.exports.components = {
  'shop_cat_*': handleShopButton,
  'shop_back': handleShopButton,
  'shop_my': handleShopButton,
  'shop_prod': handleShopButton,
};
