const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { embed, successEmbed } = require('../../utils/embed');
const { db, memberKey, getMember } = require('../../utils/database');
const { sendModLog } = require('../../services/logService');
const { L } = require('../../utils/i18n');

module.exports = {
  category: 'moderation',
  descEn: 'Remove a specific warning',
  data: new SlashCommandBuilder()
    .setName('delwarn')
    .setDescription('حذف تحذير معين')
    .setDescriptionLocalizations({ 'en-US': 'Remove a specific warning' })
    .setDefaultMemberPermissions(8)
    .addUserOption((o) => o.setName('user').setDescription(L('x', 'العضو', 'Member')).setDescriptionLocalizations({ 'en-US': 'Member' }).setRequired(true))
    .addIntegerOption((o) => o.setName('number').setDescription(L('x', 'رقم التحذير', 'Warning number')).setDescriptionLocalizations({ 'en-US': 'Warning number' }).setRequired(true).setMinValue(1)),
  async run(client, interaction) {
    const l = interaction.user.id;
    const target = interaction.options.getUser('user');
    const num = interaction.options.getInteger('number');
    const data = getMember(interaction.guild.id, target.id);
    const warns = Array.isArray(data.warns) ? data.warns : [];

    if (!warns.length || num > warns.length) return interaction.reply({ embeds: [embed(interaction.guild, { title: '❌', description: L(l, 'رقم التحذير غير موجود', 'Warning number not found'), color: 'error' })], ephemeral: true });

    const removed = warns.splice(num - 1, 1)[0];
    data.warns = warns;
    db.members.set(memberKey(interaction.guild.id, target.id), data);

    await interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '✅ تم الحذف', '✅ Deleted'), L(l, `حذف تحذير **${removed.reason}** من ${target.tag}\nالمتبقي: **${warns.length}** تحذيرات`, `Removed warning **${removed.reason}** from ${target.tag}\nRemaining: **${warns.length}** warnings`))] });
    await sendModLog(interaction.guild, embed(interaction.guild, { title: L(l, '🗑️ حذف تحذير', '🗑️ Warning removed'), description: L(l, `حذف تحذير من **${target.tag}** بواسطة **${interaction.user.tag}**`, `Removed a warning from **${target.tag}** by **${interaction.user.tag}**`) }));
  },
};
