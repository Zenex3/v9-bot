const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embed');
const { db } = require('../../utils/database');
const { L } = require('../../utils/i18n');

module.exports = {
  category: 'owner',
  descEn: 'Unblacklist a user or server (developer only)',
  data: new SlashCommandBuilder()
    .setName('unblacklist')
    .setDescription('رفع الحظر عن مستخدم او سيرفر (مطور فقط)')
    .setDescriptionLocalizations({ 'en-US': 'Unblacklist a user or server (developer only)' })
    .addStringOption((o) => o.setName('type').setDescription(L('x', 'النوع', 'Type')).setDescriptionLocalizations({ 'en-US': 'Type' }).setRequired(true).addChoices({ name: '👤 ' + L('x', 'مستخدم', 'User'), value: 'user' }, { name: '🌐 ' + L('x', 'سيرفر', 'Server'), value: 'guild' }))
    .addStringOption((o) => o.setName('id').setDescription(L('x', 'الايدي', 'ID')).setDescriptionLocalizations({ 'en-US': 'ID' }).setRequired(true))
    .setDefaultMemberPermissions(8),
  devOnly: true,
  async run(client, interaction) {
    const l = interaction.user.id;
    const type = interaction.options.getString('type');
    const id = interaction.options.getString('id');

    const bl = db.bot.ensure('blacklist', { user: [], guild: [] });
    const list = bl[type];
    const idx = list.findIndex((b) => b.id === id);
    if (idx === -1) return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'ليس في القائمة السوداء', 'Not in the blacklist'))], ephemeral: true });
    list.splice(idx, 1);
    db.bot.set('blacklist', bl);

    await interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '✅ تم رفع الحظر', '✅ Unblacklisted'), L(l, `**${type === 'user' ? 'المستخدم' : 'السيرفر'}:** ${id}`, `**${type === 'user' ? 'User' : 'Server'}:** ${id}`))] });
  },
};
