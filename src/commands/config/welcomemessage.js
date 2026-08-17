const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { embed, successEmbed } = require('../../utils/embed');
const { getSettings } = require('../../services/logService');
const { db } = require('../../utils/database');
const { L } = require('../../utils/i18n');

module.exports = {
  category: 'config',
  descEn: 'Customize the welcome message',
  data: new SlashCommandBuilder()
    .setName('welcomemessage')
    .setDescription('تخصيص رسالة الترحيب')
    .setDescriptionLocalizations({ 'en-US': 'Customize the welcome message' })
    .setDefaultMemberPermissions(8)
    .addSubcommand((s) => s.setName('set').setDescription(L('x', 'تعيين نص الترحيب', 'Set welcome text')).setDescriptionLocalizations({ 'en-US': 'Set welcome text' }).addStringOption((o) => o.setName('message').setDescription(L('x', 'النص — الخانات: {user} {server} {count}', 'Text — placeholders: {user} {server} {count}')).setDescriptionLocalizations({ 'en-US': 'Text — placeholders: {user} {server} {count}' }).setRequired(true)))
    .addSubcommand((s) => s.setName('image').setDescription(L('x', 'تعيين صورة الترحيب', 'Set welcome image')).setDescriptionLocalizations({ 'en-US': 'Set welcome image' }).addStringOption((o) => o.setName('url').setDescription(L('x', 'رابط الصورة', 'Image URL')).setDescriptionLocalizations({ 'en-US': 'Image URL' }).setRequired(true)))
    .addSubcommand((s) => s.setName('clear').setDescription(L('x', 'مسح النص المخصص', 'Clear custom text')).setDescriptionLocalizations({ 'en-US': 'Clear custom text' })),
  async run(client, interaction) {
    const l = interaction.user.id;
    const sub = interaction.options.getSubcommand();
    const settings = getSettings(interaction.guild.id);

    if (sub === 'set') {
      const msg = interaction.options.getString('message');
      if (msg.length > 1000) return interaction.reply({ embeds: [embed(interaction.guild, { title: '❌', description: L(l, 'النص طويل جدا (الحد 1000 حرف)', 'Text too long (max 1000 chars)'), color: 'error' })], ephemeral: true });
      settings.welcomeMessage = msg;
      db.guilds.set(interaction.guild.id, 'settings', settings);
      return interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '✅ تم', '✅ Done'), L(l, 'تم تعيين رسالة الترحيب المخصصة', 'Custom welcome message set'))] });
    }
    if (sub === 'image') {
      settings.welcomeImage = interaction.options.getString('url');
      db.guilds.set(interaction.guild.id, 'settings', settings);
      return interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '✅ تم', '✅ Done'), L(l, 'تم تعيين صورة الترحيب', 'Welcome image set'))] });
    }
    if (sub === 'clear') {
      settings.welcomeMessage = null;
      settings.welcomeImage = null;
      db.guilds.set(interaction.guild.id, 'settings', settings);
      return interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '✅ تم', '✅ Done'), L(l, 'تم مسح التخصيص', 'Customization cleared'))] });
    }
  },
};
