const { SlashCommandBuilder } = require('discord.js');
const { embed, errorEmbed } = require('../../utils/embed');
const { L } = require('../../utils/i18n');

module.exports = {
  category: 'owner',
  descEn: 'List all servers the bot is in (developer only)',
  data: new SlashCommandBuilder()
    .setName('servers')
    .setDescription('قائمة السيرفرات (مطور فقط)')
    .setDescriptionLocalizations({ 'en-US': 'List all servers (developer only)' })
    .setDefaultMemberPermissions(8),
  devOnly: true,
  cooldown: 10000,
  async run(client, interaction) {
    const l = interaction.user.id;
    const guilds = [...client.guilds.cache.values()].sort((a, b) => b.memberCount - a.memberCount);

    if (!guilds.length) return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'البوت ليس في أي سيرفر', 'The bot is not in any server'))], ephemeral: true });

    const pages = [];
    for (let i = 0; i < guilds.length; i += 10) pages.push(guilds.slice(i, i + 10));

    const build = (page) =>
      embed(interaction.guild, {
        title: L(l, `🌐 السيرفرات (${guilds.length})`, `🌐 Servers (${guilds.length})`),
        description: pages[page]
          .map((g) => `**${g.name}**\n👥 ${g.memberCount} — 🆔 \`${g.id}\``)
          .join('\n\n'),
        footer: { text: L(l, `صفحة ${page + 1} من ${pages.length}`, `Page ${page + 1} of ${pages.length}`) },
      });

    await interaction.reply({ embeds: [build(0)] });
  },
};
