const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { embed, successEmbed, errorEmbed } = require('../../utils/embed');
const { sendModLog } = require('../../services/logService');
const { L } = require('../../utils/i18n');

module.exports = {
  category: 'moderation',
  descEn: 'Unban a member',
  data: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('فك الحظر عن عضو')
    .setDescriptionLocalizations({ 'en-US': 'Unban a member' })
    .setDefaultMemberPermissions(8)
    .addStringOption((o) => o.setName('user_id').setDescription(L('x', 'ايدي العضو', 'Member ID')).setDescriptionLocalizations({ 'en-US': 'Member ID' }).setRequired(true)),
  botPermissions: [PermissionFlagsBits.BanMembers],
  async run(client, interaction) {
    const l = interaction.user.id;
    const userId = interaction.options.getString('user_id');
    try {
      await interaction.guild.members.unban(userId);
    } catch {
      return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'العضو غير محظور او الايدي غير صحيح', 'Member is not banned or invalid ID'))], ephemeral: true });
    }
    const user = await client.users.fetch(userId).catch(() => ({ tag: userId, id: userId }));
    await interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '🔓 تم فك الحظر', '🔓 Unbanned'), L(l, `**${user.tag}** اصبح مسموح له بالدخول`, `**${user.tag}** can now join`))] });
    await sendModLog(interaction.guild, embed(interaction.guild, { title: L(l, '🔓 انبان', '🔓 Unban'), description: L(l, `**العضو:** ${user.tag}\n**بواسطة:** ${interaction.user.tag}`, `**Member:** ${user.tag}\n**By:** ${interaction.user.tag}`), color: 'success' }));
  },
};
