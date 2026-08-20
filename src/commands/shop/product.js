const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const { embed, successEmbed, errorEmbed } = require('../../utils/embed');
const { L } = require('../../utils/i18n');
const {
  getShop,
  findProduct,
  createProduct,
  deleteProduct,
  toggleProduct,
  CATEGORIES,
} = require('../../services/shopService');

const CATEGORY_CHOICES = CATEGORIES.map((c) => ({ name: `${c.icon} ${c.ar} / ${c.en}`, value: c.id }));

module.exports = {
  category: 'shop',
  descEn: 'Manage shop products (developer only)',
  data: new SlashCommandBuilder()
    .setName('product')
    .setDescription('ادارة منتجات المتجر (مطور فقط)')
    .setDescriptionLocalizations({ 'en-US': 'Manage shop products (developer only)' })
    .addSubcommand((s) => s
      .setName('add')
      .setDescription('اضافة منتج جديد بسهولة من نافذة')
      .setDescriptionLocalizations({ 'en-US': 'Add a new product easily from a window' })
      .addStringOption((o) => o.setName('category').setDescription('فئة المنتج').setRequired(true).addChoices(...CATEGORY_CHOICES)))
    .addSubcommand((s) => s.setName('list').setDescription('عرض كل المنتجات').setDescriptionLocalizations({ 'en-US': 'List all products' }))
    .addSubcommand((s) => s.setName('remove').setDescription('حذف منتج').setDescriptionLocalizations({ 'en-US': 'Remove a product' }).addStringOption((o) => o.setName('id').setDescription('ايدي او اسم المنتج').setRequired(true)))
    .addSubcommand((s) => s.setName('toggle').setDescription('تفعيل/ايقاف منتج').setDescriptionLocalizations({ 'en-US': 'Enable/disable a product' }).addStringOption((o) => o.setName('id').setDescription('ايدي او اسم المنتج').setRequired(true)))
    .addSubcommand((s) => s.setName('link').setDescription('اضافة/تغيير رابط تحميل ب عنوان يظهر للمشترك تحت الشرح').setDescriptionLocalizations({ 'en-US': 'Set a titled download link shown to the subscriber under the description' })
      .addStringOption((o) => o.setName('id').setDescription('ايدي او اسم المنتج').setRequired(true))
      .addStringOption((o) => o.setName('url').setDescription('الرابط').setRequired(true))
      .addStringOption((o) => o.setName('title').setDescription('اسم التحميل — يظهر كعنوان فوق الرابط (اختياري)').setDescriptionLocalizations({ 'en-US': 'Download name shown as the link title (optional)' })))
    .addSubcommand((s) => s.setName('image').setDescription('اضافة/تغيير صورة المنتج (تظهر للمشترك)').setDescriptionLocalizations({ 'en-US': 'Set product image (shown to subscriber)' })
      .addStringOption((o) => o.setName('id').setDescription('ايدي او اسم المنتج').setRequired(true))
      .addStringOption((o) => o.setName('url').setDescription('رابط الصورة — مثال: https://.../img.png').setRequired(true)))
    .setDefaultMemberPermissions(8),
  devOnly: true,
  async run(client, interaction) {
    const l = interaction.user.id;
    const sub = interaction.options.getSubcommand();

    if (sub === 'add') {
      const category = interaction.options.getString('category');
      // الكاتيجوري محفوظة في customId كي لا تعتمد على حالة مشتركة بين نسختين من الملف
      const modalCustomId = `product_add_modal_${category}`;

      const nameInput = new TextInputBuilder()
        .setCustomId('product_name')
        .setLabel('اسم المنتج')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(60);
      const descInput = new TextInputBuilder()
        .setCustomId('product_desc')
        .setLabel('وصف المنتج')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMaxLength(300);
      const contentInput = new TextInputBuilder()
        .setCustomId('product_content')
        .setLabel('محتوى المنتج (يُرسل للمشترك عند التفعيل)')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false)
        .setMaxLength(1000);
      const imageInput = new TextInputBuilder()
        .setCustomId('product_image')
        .setLabel('رابط صورة المنتج (اختياري) — تظهر للمشترك')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setMaxLength(200);
      const durationInput = new TextInputBuilder()
        .setCustomId('product_duration')
        .setLabel('المدة (اختياري) مثال: 30d')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setMaxLength(20);

      const modal = new ModalBuilder()
        .setCustomId(modalCustomId)
        .setTitle(`➕ اضافة منتج — ${CATEGORIES.find((c) => c.id === category)?.icon || '🛒'} ${CATEGORIES.find((c) => c.id === category)?.ar || category}`)
        .addComponents(
          new ActionRowBuilder().addComponents(nameInput),
          new ActionRowBuilder().addComponents(descInput),
          new ActionRowBuilder().addComponents(contentInput),
          new ActionRowBuilder().addComponents(imageInput),
          new ActionRowBuilder().addComponents(durationInput),
        );
      return interaction.showModal(modal);
    }

    if (sub === 'list') {
      const shop = getShop();
      const products = Object.values(shop.products);
      if (!products.length) {
        return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'لا توجد منتجات بعد، استخدم /product add', 'No products yet, use /product add'))] });
      }
      const desc = products
        .map((p) => {
          const cat = CATEGORIES.find((c) => c.id === (p.category || 'tools'));
          return `**${p.name}** — \`${p.id}\`\n${cat.icon} ${cat.ar} | ${p.enabled ? '🟢 متاح' : '🔴 موقوف'}${p.price ? ` | 💰 ${p.price}` : ''}${p.duration ? ` | ⏳ ${p.duration}` : ''}`;
        })
        .join('\n\n');
      return interaction.reply({ embeds: [embed(interaction.guild, { title: `🛒 المنتجات (${products.length})`, description: desc, color: 'info' })] });
    }

    const id = interaction.options.getString('id');
    const shop = getShop();
    const product = findProduct(shop, id);
    if (!product) {
      return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'المنتج غير موجود', 'Product not found'))] });
    }

    if (sub === 'remove') {
      deleteProduct(product.id);
      return interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '✅ تم الحذف', '✅ Removed'), `${L(l, 'تم حذف المنتج', 'Product removed')}: **${product.name}**`)] });
    }

    if (sub === 'toggle') {
      const p = toggleProduct(product.id);
      return interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '✅ تم', '✅ Done'), `${L(l, 'المنتج', 'Product')} **${p.name}** ${p.enabled ? L(l, 'اصبح متاحا', 'is now available') : L(l, 'تم ايقافه', 'is now disabled')}`)] });
    }

    if (sub === 'link') {
      const url = interaction.options.getString('url');
      const title = interaction.options.getString('title')?.trim() || null;
      product.contentLink = url || null;
      product.contentLinkTitle = title || null;
      const { saveShop } = require('../../services/shopService');
      saveShop(getShop());
      const added = title ? `**⬇️ [${title}](${url})**` : `**⬇️ ${url}**`;
      return interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '✅ تم الحفظ', '✅ Saved'), `${L(l, 'تم تحديث رابط التحميل', 'Download link updated for')} **${product.name}**\n${added}`)] });
    }

    if (sub === 'image') {
      const url = interaction.options.getString('url');
      product.image = url || null;
      const { saveShop } = require('../../services/shopService');
      saveShop(getShop());
      return interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '✅ تم الحفظ', '✅ Saved'), `${L(l, 'تم تحديث صورة', 'Product image updated for')} **${product.name}**`)] });
    }
  },
};

// معالجة إرسال النافذة — البادئة تجلب الكاتيجوري من customId مباشرة
async function handleModal(client, interaction) {
  const l = interaction.user.id;
  const category = interaction.customId.replace('product_add_modal_', '');
  if (!CATEGORIES.some((c) => c.id === category)) {
    return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'فئة غير صالحة، استخدم /product add من جديد', 'Invalid category, run /product add again'))] });
  }

  const name = interaction.fields.getTextInputValue('product_name')?.trim();
  const description = interaction.fields.getTextInputValue('product_desc')?.trim();
  const content = interaction.fields.getTextInputValue('product_content')?.trim() || '';
  const duration = interaction.fields.getTextInputValue('product_duration')?.trim() || null;
  const image = interaction.fields.getTextInputValue('product_image')?.trim() || null;

  const product = createProduct({ name, description, duration, content, category, image });
  const cat = CATEGORIES.find((c) => c.id === product.category);
  const descMsg = `**${cat.icon} ${cat.ar}**\n**المنتج:** ${product.name}\n**الايدي:** \`${product.id}\`\n${duration ? `**المدة:** ${duration}\n` : ''}${image ? `**🖼️ صورة:** اضيفت ✅\n` : ''}\n\n🎟️ تذكّر: سيريال الاشتراك الواحد بيفعّل **كل المنتجات** للعميل.`;
  return interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '✅ تم اضافة المنتج', '✅ Product added'), descMsg)] });
}

module.exports.components = {
  'product_add_modal_*': handleModal,
};