const { SlashCommandBuilder } = require('discord.js');
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
      .setDescription('اضافة منتج جديد')
      .setDescriptionLocalizations({ 'en-US': 'Add a new product' })
      .addStringOption((o) => o.setName('category').setDescription('فئة المنتج').setRequired(true).addChoices(...CATEGORY_CHOICES))
      .addStringOption((o) => o.setName('name').setDescription('اسم المنتج').setRequired(true).setMaxLength(60))
      .addStringOption((o) => o.setName('description').setDescription('وصف المنتج').setRequired(true).setMaxLength(300))
      .addStringOption((o) => o.setName('content').setDescription('محتوى المنتج (يُرسل للمشترك)').setRequired(true).setMaxLength(1000))
      .addStringOption((o) => o.setName('price').setDescription('السعر (اختياري)').setRequired(false).setMaxLength(40))
      .addStringOption((o) => o.setName('duration').setDescription('المدة الافتراضية (اختياري) مثال: 30d').setRequired(false).setMaxLength(20)))
    .addSubcommand((s) => s.setName('list').setDescription('عرض كل المنتجات').setDescriptionLocalizations({ 'en-US': 'List all products' }))
    .addSubcommand((s) => s.setName('remove').setDescription('حذف منتج').setDescriptionLocalizations({ 'en-US': 'Remove a product' }).addStringOption((o) => o.setName('id').setDescription('ايدي او اسم المنتج').setRequired(true)))
    .addSubcommand((s) => s.setName('toggle').setDescription('تفعيل/ايقاف منتج').setDescriptionLocalizations({ 'en-US': 'Enable/disable a product' }).addStringOption((o) => o.setName('id').setDescription('ايدي او اسم المنتج').setRequired(true)))
    .setDefaultMemberPermissions(8),
  devOnly: true,
  async run(client, interaction) {
    const l = interaction.user.id;
    const sub = interaction.options.getSubcommand();

    if (sub === 'add') {
      const category = interaction.options.getString('category');
      const name = interaction.options.getString('name');
      const description = interaction.options.getString('description');
      const price = interaction.options.getString('price');
      const duration = interaction.options.getString('duration');
      const content = interaction.options.getString('content');

      const product = createProduct({ name, description, price, duration, content, category });
      const cat = CATEGORIES.find((c) => c.id === product.category);
      const descMsg = `**${cat.icon} ${cat.ar}**\n**المنتج:** ${product.name}\n**الايدي:** \`${product.id}\`\n${price ? `**السعر:** ${price}\n` : ''}${duration ? `**المدة:** ${duration}\n` : ''}\n\n🎟️ تذكّر: سيريال الاشتراك الواحد بيفعّل **كل المنتجات** للعميل.`;
      return interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '✅ تم اضافة المنتج', '✅ Product added'), descMsg)] });
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
  },
};
