const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { embed, successEmbed } = require('../../utils/embed');
const { L } = require('../../utils/i18n');

function isImageURL(url) {
  return /^https?:\/\/\S+\.(png|jpe?g|gif|webp|bmp)(\?\S*)?$/i.test(url);
}

const COLOR_NAMES = ['red', 'darkRed', 'green', 'orange', 'blue', 'purple', 'pink', 'yellow', 'cyan', 'white', 'black', 'success', 'error', 'warning', 'info'];

function resolveColor(input) {
  if (!input) return 'red';
  const name = input.toLowerCase();
  if (COLOR_NAMES.some((c) => c.toLowerCase() === name)) return input;
  const hex = input.replace(/^#/, '');
  if (/^[0-9a-fA-F]{6}$/.test(hex)) return `#${hex}`;
  return null;
}

module.exports = {
  category: 'config',
  descEn: 'Build and send a custom embed',
  data: new SlashCommandBuilder()
    .setName('embedbuilder')
    .setDescription('انشاء ايمبد مخصص')
    .setDescriptionLocalizations({ 'en-US': 'Build and send a custom embed' })
    .setDefaultMemberPermissions(8)
    .addStringOption((o) => o.setName('title').setDescription(L('x', 'العنوان', 'Title')).setDescriptionLocalizations({ 'en-US': 'Title' }))
    .addStringOption((o) => o.setName('description').setDescription(L('x', 'الوصف', 'Description')).setDescriptionLocalizations({ 'en-US': 'Description' }))
    .addStringOption((o) => o.setName('footer').setDescription(L('x', 'التذييل', 'Footer')).setDescriptionLocalizations({ 'en-US': 'Footer' }))
    .addStringOption((o) => o.setName('image').setDescription(L('x', 'رابط الصورة', 'Image URL')).setDescriptionLocalizations({ 'en-US': 'Image URL' }))
    .addStringOption((o) => o.setName('thumbnail').setDescription(L('x', 'رابط المصغرة', 'Thumbnail URL')).setDescriptionLocalizations({ 'en-US': 'Thumbnail URL' }))
    .addStringOption((o) => o.setName('color').setDescription(L('x', 'لون (red/darkRed/green/orange/blue أو HEX)', 'Color (red/darkRed/green/orange/blue or HEX)')).setDescriptionLocalizations({ 'en-US': 'Color (red/darkRed/green/orange/blue or HEX)' }))
    .addChannelOption((o) => o.setName('channel').setDescription(L('x', 'القناة (اختياري)', 'Channel (optional)')).setDescriptionLocalizations({ 'en-US': 'Channel (optional)' }).addChannelTypes(ChannelType.GuildText)),
  async run(client, interaction) {
    const l = interaction.user.id;
    const title = interaction.options.getString('title');
    const desc = interaction.options.getString('description');
    const footer = interaction.options.getString('footer');
    const image = interaction.options.getString('image');
    const thumbnail = interaction.options.getString('thumbnail');
    const color = interaction.options.getString('color') || 'red';
    const channel = interaction.options.getChannel('channel') || interaction.channel;

    const colorResolved = resolveColor(color);
    if (!colorResolved) {
      return interaction.reply({ embeds: [embed(interaction.guild, { title: '❌', description: L(l, 'لون غير صالح — استخدم اسم لون أو HEX مثل #ff0000', 'Invalid color — use a color name or HEX like #ff0000'), color: 'error' })], ephemeral: true });
    }

    if (!title && !desc && !image && !thumbnail) {
      return interaction.reply({ embeds: [embed(interaction.guild, { title: '❌', description: L(l, 'حدد على الاقل عنوان او وصف او صورة', 'Provide at least a title, description or image'), color: 'error' })], ephemeral: true });
    }
    if (image && !isImageURL(image)) {
      return interaction.reply({ embeds: [embed(interaction.guild, { title: '❌', description: L(l, 'رابط الصورة غير صالح', 'Invalid image URL'), color: 'error' })], ephemeral: true });
    }
    if (thumbnail && !isImageURL(thumbnail)) {
      return interaction.reply({ embeds: [embed(interaction.guild, { title: '❌', description: L(l, 'رابط المصغرة غير صالح', 'Invalid thumbnail URL'), color: 'error' })], ephemeral: true });
    }

    const built = embed(interaction.guild, {
      title,
      description: desc,
      footer: footer ? { text: footer } : null,
      image,
      thumbnail,
      color: colorResolved,
    });

    if (channel.id !== interaction.channel.id) {
      await channel.send({ embeds: [built] }).catch(() => null);
      return interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '✅ تم', '✅ Done'), L(l, `تم ارسال الايمبد إلى ${channel}`, `Embed sent to ${channel}`))], ephemeral: true });
    }
    await interaction.reply({ embeds: [built] });
  },
};
