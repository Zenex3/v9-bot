const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embed');
const { L } = require('../../utils/i18n');

module.exports = {
  category: 'owner',
  descEn: 'Make the bot leave a server (developer only)',
  data: new SlashCommandBuilder()
    .setName('guildleave')
    .setDescription('خروج البوت من سيرفر (مطور فقط)')
    .setDescriptionLocalizations({ 'en-US': 'Leave a server (developer only)' })
    .addStringOption((o) => o.setName('id').setDescription(L('x', 'ايدي السيرفر', 'Server ID')).setDescriptionLocalizations({ 'en-US': 'Server ID' }).setRequired(true))
    .setDefaultMemberPermissions(8),
  devOnly: true,
  async run(client, interaction) {
    const l = interaction.user.id;
    const id = interaction.options.getString('id');
    const guild = client.guilds.cache.get(id);
    if (!guild) return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'السيرفر غير موجود', 'Server not found'))], ephemeral: true });

    await guild.leave();
    await interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '✅ تم', '✅ Done'), L(l, `غادر البوت سيرفر **${guild.name}**`, `The bot left **${guild.name}**`))] });
  },
};
