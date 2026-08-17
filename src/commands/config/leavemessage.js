const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { embed, successEmbed } = require('../../utils/embed');
const { getSettings } = require('../../services/logService');
const { db } = require('../../utils/database');
const { L } = require('../../utils/i18n');

module.exports = {
  category: 'config',
  descEn: 'Customize the leave message',
  data: new SlashCommandBuilder()
    .setName('leavemessage')
    .setDescription('تخصيص رسالة الوداع')
    .setDescriptionLocalizations({ 'en-US': 'Customize the leave message' })
    .setDefaultMemberPermissions(8)
    .addSubcommand((s) => s.setName('set').setDescription(L('x', 'تعيين نص الوداع', 'Set leave text')).setDescriptionLocalizations({ 'en-US': 'Set leave text' }).addStringOption((o) => o.setName('message').setDescription(L('x', 'النص — الخانات: {user} {server} {count}', 'Text — placeholders: {user} {server} {count}')).setDescriptionLocalizations({ 'en-US': 'Text — placeholders: {user} {server} {count}' }).setRequired(true)))
    .addSubcommand((s) => s.setName('image').setDescription(L('x', 'تعيين صورة الوداع', 'Set leave image')).setDescriptionLocalizations({ 'en-US': 'Set leave image' }).addStringOption((o) => o.setName('url').setDescription(L('x', 'رابط الصورة', 'Image URL')).setDescriptionLocalizations({ 'en-US': 'Image URL' }).setRequired(true)))
    .addSubcommand((s) => s.setName('clear').setDescription(L('x', 'مسح النص المخصص', 'Clear custom text')).setDescriptionLocalizations({ 'en-US': 'Clear custom text' })),
  async run(client, interaction) {
    const l = interaction.user.id;
    const sub = interaction.options.getSubcommand();
    const settings = getSettings(interaction.guild.id);

    if (sub === 'set') {
      const msg = interaction.options.getString('message');
      if (msg.length > 1000) return interaction.reply({ embeds: [embed(interaction.guild, { title: '❌', description: L(l, 'النص طويل جدا (الحد 1000 حرف)', 'Text too long (max 1000 chars)'), color: 'error' })], ephemeral: true });
      settings.leaveMessage = msg;
      db.guilds.set(interaction.guild.id, 'settings', settings);
      return interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '✅ تم', '✅ Done'), L(l, 'تم تعيين رسالة الوداع المخصصة', 'Custom leave message set'))] });
    }
    if (sub === 'image') {
      settings.leaveImage = interaction.options.getString('url');
      db.guilds.set(interaction.guild.id, 'settings', settings);
      return interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '✅ تم', '✅ Done'), L(l, 'تم تعيين صورة الوداع', 'Leave image set'))] });
    }
    if (sub === 'clear') {
      settings.leaveMessage = null;
      settings.leaveImage = null;
      db.guilds.set(interaction.guild.id, 'settings', settings);
      return interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '✅ تم', '✅ Done'), L(l, 'تم مسح التخصيص', 'Customization cleared'))] });
    }
  },
};
