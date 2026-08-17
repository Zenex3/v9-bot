const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { embed, successEmbed, errorEmbed } = require('../../utils/embed');
const { L } = require('../../utils/i18n');

module.exports = {
  category: 'moderation',
  descEn: 'Send a private message to a member',
  data: new SlashCommandBuilder()
    .setName('dm')
    .setDescription('ارسال رسالة خاصة لعضو')
    .setDescriptionLocalizations({ 'en-US': 'Send a private message to a member' })
    .setDefaultMemberPermissions(8)
    .addUserOption((o) => o.setName('user').setDescription(L('x', 'العضو', 'Member')).setDescriptionLocalizations({ 'en-US': 'Member' }).setRequired(true))
    .addStringOption((o) => o.setName('message').setDescription(L('x', 'الرسالة', 'Message')).setDescriptionLocalizations({ 'en-US': 'Message' }).setRequired(true)),
  async run(client, interaction) {
    const l = interaction.user.id;
    const target = interaction.options.getUser('user');
    const message = interaction.options.getString('message');
    try {
      await target.send({ embeds: [embed(interaction.guild, { title: L(l, `📨 رسالة من ${interaction.guild.name}`, `📨 Message from ${interaction.guild.name}`), description: message, color: 'info' })] });
    } catch {
      return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'لا يمكن الوصول للعضو، الرسائل الخاصة مغلقة لديه', 'Cannot reach the member, DMs are closed'))], ephemeral: true });
    }
    await interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '📨 تم الارسال', '📨 Sent'), L(l, `تم ارسال الرسالة لـ **${target.tag}**`, `Message sent to **${target.tag}**`))] });
  },
};
