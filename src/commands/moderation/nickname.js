const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { embed, successEmbed, errorEmbed } = require('../../utils/embed');
const { sendModLog } = require('../../services/logService');
const { L } = require('../../utils/i18n');

module.exports = {
  category: 'moderation',
  descEn: 'Change a member nickname',
  data: new SlashCommandBuilder()
    .setName('nickname')
    .setDescription('تغيير اسم عضو')
    .setDescriptionLocalizations({ 'en-US': 'Change a member nickname' })
    .setDefaultMemberPermissions(8)
    .addUserOption((o) => o.setName('user').setDescription(L('x', 'العضو', 'Member')).setDescriptionLocalizations({ 'en-US': 'Member' }).setRequired(true))
    .addStringOption((o) => o.setName('nick').setDescription(L('x', 'الاسم الجديد (اتركه فارغا لالغاء)', 'New name (empty to reset)')).setDescriptionLocalizations({ 'en-US': 'New name (empty to reset)' })),
  botPermissions: [PermissionFlagsBits.ManageNicknames],
  async run(client, interaction) {
    const l = interaction.user.id;
    const target = interaction.options.getUser('user');
    const nick = interaction.options.getString('nick');
    const member = await interaction.guild.members.fetch(target.id).catch(() => null);
    if (!member) return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'العضو غير موجود', 'Member not found'))], ephemeral: true });

    try {
      await member.setNickname(nick || null, interaction.user.tag);
    } catch {
      return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'فشل تغيير الاسم', 'Failed to change nickname'))], ephemeral: true });
    }
    await interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '📛 تم', '📛 Done'), L(l, `اسم **${target.tag}** اصبح **${nick || 'الاصلي'}**`, `**${target.tag}** name is now **${nick || 'default'}**`))] });
    await sendModLog(interaction.guild, embed(interaction.guild, { title: L(l, '📛 تغيير اسم', '📛 Nickname change'), description: L(l, `**${target.tag}** -> **${nick || 'الاصلي'}** بواسطة ${interaction.user.tag}`, `**${target.tag}** -> **${nick || 'default'}** by ${interaction.user.tag}`) }));
  },
};
