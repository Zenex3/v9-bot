const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { embed, successEmbed } = require('../../utils/embed');
const { db, memberKey, getMember } = require('../../utils/database');
const { sendModLog } = require('../../services/logService');
const { L } = require('../../utils/i18n');

module.exports = {
  category: 'moderation',
  descEn: 'Clear all warnings of a member',
  data: new SlashCommandBuilder()
    .setName('clearwarns')
    .setDescription('مسح كل تحذيرات عضو')
    .setDescriptionLocalizations({ 'en-US': 'Clear all warnings of a member' })
    .setDefaultMemberPermissions(8)
    .addUserOption((o) => o.setName('user').setDescription(L('x', 'العضو', 'Member')).setDescriptionLocalizations({ 'en-US': 'Member' }).setRequired(true)),
  async run(client, interaction) {
    const l = interaction.user.id;
    const target = interaction.options.getUser('user');
    const data = getMember(interaction.guild.id, target.id);
    const warns = Array.isArray(data.warns) ? data.warns : [];
    if (!warns.length) return interaction.reply({ embeds: [embed(interaction.guild, { title: 'ℹ️', description: L(l, `${target.tag} ليس لديه تحذيرات`, `${target.tag} has no warnings`), color: 'info' })], ephemeral: true });

    data.warns = [];
    db.members.set(memberKey(interaction.guild.id, target.id), data);
    await interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '🧹 تم المسح', '🧹 Cleared'), L(l, `تم مسح **${warns.length}** تحذير من ${target.tag}`, `Cleared **${warns.length}** warnings from ${target.tag}`))] });
    await sendModLog(interaction.guild, embed(interaction.guild, { title: L(l, '🧹 مسح تحذيرات', '🧹 Warnings cleared'), description: L(l, `مسح **${warns.length}** تحذير من **${target.tag}** بواسطة **${interaction.user.tag}**`, `Cleared **${warns.length}** warnings from **${target.tag}** by **${interaction.user.tag}**`) }));
  },
};
