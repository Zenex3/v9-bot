const { SlashCommandBuilder } = require('discord.js');
const { successEmbed } = require('../../utils/embed');
const { L } = require('../../utils/i18n');

module.exports = {
  category: 'owner',
  descEn: 'Shut down the bot (developer only)',
  data: new SlashCommandBuilder()
    .setName('shutdown')
    .setDescription('اغلاق البوت نهائيا (مطور فقط)')
    .setDescriptionLocalizations({ 'en-US': 'Shut down the bot (developer only)' })
    .setDefaultMemberPermissions(8),
  devOnly: true,
  async run(client, interaction) {
    const l = interaction.user.id;
    await interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '🛑 جاري الاغلاق', '🛑 Shutting down'), L(l, 'تم اغلاق البوت، شغله مرة اخرى بـ node index.js', 'Bot is shutting down. Start it again with node index.js'))] });
    setTimeout(() => process.exit(0), 1500);
  },
};
