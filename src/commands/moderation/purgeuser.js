const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed } = require('../../utils/embed');
const { L } = require('../../utils/i18n');

module.exports = {
  category: 'moderation',
  descEn: 'Purge messages from a specific member',
  data: new SlashCommandBuilder()
    .setName('purgeuser')
    .setDescription('مسح رسائل عضو محدد')
    .setDescriptionLocalizations({ 'en-US': 'Purge messages from a member' })
    .setDefaultMemberPermissions(8)
    .addUserOption((o) => o.setName('user').setDescription(L('x', 'العضو', 'Member')).setDescriptionLocalizations({ 'en-US': 'Member' }).setRequired(true))
    .addIntegerOption((o) => o.setName('count').setDescription(L('x', 'عدد الرسائل', 'Message count')).setDescriptionLocalizations({ 'en-US': 'Message count' }).setRequired(true).setMinValue(1).setMaxValue(100)),
  botPermissions: [PermissionFlagsBits.ManageMessages, PermissionFlagsBits.ReadMessageHistory],
  async run(client, interaction) {
    const l = interaction.user.id;
    const user = interaction.options.getUser('user');
    const count = interaction.options.getInteger('count');

    let deleted = 0;
    let remaining = count;
    while (remaining > 0) {
      const msgs = await interaction.channel.messages.fetch({ limit: Math.min(remaining + 1, 100) });
      const targets = msgs.filter((m) => m.author.id === user.id);
      const toDelete = targets.first(Math.min(targets.size, 100));
      if (!toDelete.size) break;
      await interaction.channel.bulkDelete(toDelete).catch(() => null);
      deleted += toDelete.size;
      remaining = count - deleted;
      if (toDelete.size < 2) break;
    }

    const reply = await interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '🧹 Purge User', '🧹 Purge User'), L(l, `تم مسح **${deleted}** رسالة لـ **${user.tag}**`, `Deleted **${deleted}** messages from **${user.tag}**`))] });
    setTimeout(() => reply.delete().catch(() => null), 5000);
  },
};
