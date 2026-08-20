const { SlashCommandBuilder } = require('discord.js');
const { redeemSerial } = require('../../services/shopService');
const logger = require('../../utils/logger');

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
    try {
      const result = await redeemSerial(client, interaction.user, key);
      if (result && result.embed) {
        await interaction.reply({ embeds: [result.embed], ephemeral: true });
      } else {
        const { errorEmbed } = require('../../utils/embed');
        await interaction.reply({ embeds: [errorEmbed(null, '❌', 'حدث خطأ غير متوقع')], ephemeral: true });
      }
    } catch (err) {
      logger.error(`[REDEEM] خطأ في تفعيل السيريال "${key}" للمستخدم ${interaction.user.id}:`, err);
      const { errorEmbed } = require('../../utils/embed');
      try {
        await interaction.reply({ embeds: [errorEmbed(null, '❌', 'حدث خطأ أثناء تفعيل السيريال — تحقق من السيرفر أو حاول مرة اخرى')], ephemeral: true });
      } catch {}
    }
  },
};
