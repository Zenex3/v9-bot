const { SlashCommandBuilder } = require('discord.js');
const { embed } = require('../../utils/embed');
const { L } = require('../../utils/i18n');

module.exports = {
  category: 'info',
  descEn: 'Show a member profile picture',
  data: new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('عرض صورة بروفايل عضو')
    .setDescriptionLocalizations({ 'en-US': 'Show a member profile picture' })
    .addUserOption((o) => o.setName('user').setDescription(L('x', 'العضو (اختياري)', 'Member (optional)')).setDescriptionLocalizations({ 'en-US': 'Member (optional)' })),
  cooldown: 3000,
  async run(client, interaction) {
    const l = interaction.user.id;
    const user = interaction.options.getUser('user') || interaction.user;
    const avatar = user.displayAvatarURL({ size: 1024, extension: 'png' });
    const avatarEmbed = embed(interaction.guild, {
      title: `${L(l, '🖼️ صورة', '🖼️ Avatar')} ${user.tag}`,
      image: avatar,
      url: avatar,
    });
    await interaction.reply({ embeds: [avatarEmbed] });
  },
};
