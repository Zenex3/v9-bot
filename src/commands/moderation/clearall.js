const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { embed, successEmbed, errorEmbed } = require('../../utils/embed');
const { sendModLog } = require('../../services/logService');
const { L } = require('../../utils/i18n');

module.exports = {
  category: 'moderation',
  descEn: 'Delete all channels in the server',
  data: new SlashCommandBuilder()
    .setName('clearall')
    .setDescription('حذف جميع القنوات في السيرفر')
    .setDescriptionLocalizations({ 'en-US': 'Delete all channels in the server' })
    .setDefaultMemberPermissions(8),
  async run(client, interaction) {
    const l = interaction.user.id;
    const channels = interaction.guild.channels.cache.filter((c) => c.id !== interaction.channel.id);
    if (!channels.size) return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'لا توجد قنوات للحذف', 'No channels to delete'))], ephemeral: true });

    await interaction.reply({ embeds: [embed(interaction.guild, { title: '⏳', description: L(l, `جاري حذف **${channels.size}** قناة...`, `Deleting **${channels.size}** channels...`), color: 'info' })] });

    for (const c of channels.values()) {
      await c.delete('Clear all').catch(() => null);
    }

    await interaction.editReply({ embeds: [successEmbed(interaction.guild, L(l, '🗑️ تم الحذف', '🗑️ Deleted'), L(l, `تم حذف **${channels.size}** قناة`, `Deleted **${channels.size}** channels`))] });
    await sendModLog(interaction.guild, embed(interaction.guild, { title: L(l, '🗑️ Clear All', '🗑️ Clear All'), description: L(l, `**القنوات المحذوفة:** ${channels.size}\n**بواسطة:** ${interaction.user.tag}`, `**Deleted channels:** ${channels.size}\n**By:** ${interaction.user.tag}`) }));
  },
};
