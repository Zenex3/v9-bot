const crypto = require('crypto');
const { StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const config = require('../../config.json');
const { db } = require('../utils/database');
const { embed, successEmbed, errorEmbed, warnEmbed, row, ButtonBuilder, ButtonStyle } = require('../utils/embed');
const { formatTime, relative } = require('../utils/functions');
const { L: pick } = require('../utils/i18n');
const logger = require('../utils/logger');

const SERVER_INVITE = 'https://discord.gg/KwbNWbHmnH';
const SERIAL_REGEX = /^V9-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}$/i;
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

const CATEGORIES = [
  { id: 'bots', icon: '🤖', ar: 'بوتات', en: 'Bots' },
  { id: 'websites', icon: '🌐', ar: 'مواقع', en: 'Websites' },
  { id: 'tools', icon: '🛠️', ar: 'ادوات', en: 'Tools' },
  { id: 'services', icon: '🛡️', ar: 'خدمات', en: 'Services' },
];

function getCategory(catId) {
  return CATEGORIES.find((c) => c.id === catId) || CATEGORIES[2];
}

function getShop() {
  const shop = db.bot.ensure('shop', {
    invite: SERVER_INVITE,
    products: {},
    serials: {},
    subscriptions: {},
  });
  if (!shop.products || typeof shop.products !== 'object') shop.products = {};
  if (!shop.serials || typeof shop.serials !== 'object') shop.serials = {};
  if (!shop.subscriptions || typeof shop.subscriptions !== 'object') shop.subscriptions = {};
  if (shop.licenses && typeof shop.licenses === 'object') {
    for (const uid of Object.keys(shop.licenses)) {
      const raw = shop.licenses[uid];
      const legacy = Array.isArray(raw) ? raw[0] : raw;
      if (legacy && legacy.expiresAt && !shop.subscriptions[uid]) shop.subscriptions[uid] = legacy;
    }
    delete shop.licenses;
  }
  if (!shop.invite) shop.invite = SERVER_INVITE;
  return shop;
}

function saveShop(shop) {
  db.bot.set('shop', shop);
  db.bot.flush();
}

function randChars(n) {
  let s = '';
  const bytes = crypto.randomBytes(n);
  for (let i = 0; i < n; i++) s += ALPHABET[bytes[i] % ALPHABET.length];
  return s;
}

function makeSerialKey() {
  return `V9-${randChars(5)}-${randChars(5)}-${randChars(5)}`;
}

function findProduct(shop, query) {
  if (!query) return null;
  query = String(query).trim();
  const list = Object.values(shop.products);
  const byId = list.find((p) => p.id === query);
  if (byId) return byId;
  return list.find((p) => p.name.toLowerCase() === query.toLowerCase()) || null;
}

function createProduct({ name, description, price, duration, content, category, image }) {
  const shop = getShop();
  const id = 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const product = {
    id,
    name,
    description: description || 'لا يوجد وصف',
    price: price || null,
    duration: duration || null,
    content: content || '',
    image: image || null,
    category: CATEGORIES.some((c) => c.id === category) ? category : 'tools',
    enabled: true,
    createdAt: Date.now(),
  };
  shop.products[id] = product;
  saveShop(shop);
  return product;
}

function deleteProduct(productId) {
  const shop = getShop();
  const p = shop.products[productId];
  if (!p) return false;
  delete shop.products[productId];
  saveShop(shop);
  return true;
}

function toggleProduct(productId) {
  const shop = getShop();
  const p = shop.products[productId];
  if (!p) return null;
  p.enabled = !p.enabled;
  saveShop(shop);
  return p;
}

function createSerials({ userId, durationMs, amount, createdBy }) {
  const shop = getShop();
  if (!durationMs || durationMs <= 0) throw new Error('المدة غير صالحة');
  const keys = [];
  for (let i = 0; i < amount; i++) {
    let key = makeSerialKey();
    while (shop.serials[key]) key = makeSerialKey();
    shop.serials[key] = {
      key,
      userId: userId || null,
      durationMs,
      createdAt: Date.now(),
      createdBy,
      used: false,
      usedBy: null,
      usedAt: null,
      expiresAt: null,
    };
    keys.push(key);
  }
  saveShop(shop);
  return keys;
}

function deleteSerial(key) {
  const shop = getShop();
  key = String(key).trim().toUpperCase();
  if (!shop.serials[key]) return false;
  delete shop.serials[key];
  saveShop(shop);
  return true;
}

function getSerial(key) {
  const shop = getShop();
  return shop.serials[String(key).trim().toUpperCase()] || null;
}

function listSerials({ status = 'all', limit = 50 } = {}) {
  const shop = getShop();
  let arr = Object.values(shop.serials);
  if (status === 'used') arr = arr.filter((s) => s.used);
  if (status === 'unused') arr = arr.filter((s) => !s.used);
  arr.sort((a, b) => b.createdAt - a.createdAt);
  return arr.slice(0, limit);
}

function getUserSubscription(userId) {
  const shop = getShop();
  const sub = shop.subscriptions[userId];
  return sub && sub.expiresAt ? { ...sub } : null;
}

function isSubscribed(userId) {
  const sub = getUserSubscription(userId);
  return !!(sub && sub.expiresAt > Date.now());
}

function getAllProductsContent(shop) {
  const shopRef = shop || getShop();
  const list = Object.values(shopRef.products).filter((p) => p.enabled && p.content);
  if (!list.length) return '';
  return list.map((p) => `**📦 ${p.name}:**\n${p.content}`).join('\n\n');
}

async function redeemSerial(client, user, rawKey) {
  const key = String(rawKey || '').trim().toUpperCase();
  const shop = getShop();
  const serial = shop.serials[key];
  const userId = user.id;

  if (!serial) {
    return {
      ok: false,
      embed: errorEmbed(null, pick(userId, '❌ سيريال غير صالح', '❌ Invalid serial'), pick(userId,
        `السيريال **${key || '(فارغ)'}** غير موجود او غير صحيح.\n\n⚠️ **عشان تشترك لازم تشتري سيريال من هنا:**\n🔗 **${shop.invite}**`,
        `The serial **${key || '(empty)'}** does not exist or is invalid.\n\n⚠️ **To subscribe you need to buy a serial from here:**\n🔗 **${shop.invite}**`)),
    };
  }

  if (!serial.userId) {
    // Public serials: anyone can use, skip used check
  } else {
    if (serial.userId !== user.id) {
      return {
        ok: false,
        embed: errorEmbed(null, pick(userId, '⛔ سيريال مخصص لشخص اخر', '⛔ Serial for another person'), pick(userId,
          `هذا السيريال مخصص لشخص **اخر** فقط ولا يصلح لاستخدامك.\n\n⚠️ **لو عايز تشترك اشتري من هنا:**\n🔗 **${shop.invite}**`,
          `This serial is dedicated to **another** person only and cannot be used by you.\n\n⚠️ **To subscribe, buy from here:**\n🔗 **${shop.invite}**`)),
      };
    }

    if (serial.used) {
      const sub = getUserSubscription(user.id);
      if (sub && sub.expiresAt > now) {
        return {
          ok: false,
          embed: warnEmbed(null, pick(userId, '⚠️ سيريال مفعل بالفعل', '⚠️ Serial already activated'), pick(userId,
            `هذا السيريال مفعل بالفعل على **حسابك**.\n\n**الحالة:** 🟢 مفعل\n**ينتهي:** ${relative(sub.expiresAt)}\n\nاستخدم امر **my** لعرض اشتراكك ومحتوى كل منتجاتك.`,
            `This serial is already activated on **your account**.\n\n**Status:** 🟢 Active\n**Expires:** ${relative(sub.expiresAt)}\n\nUse the **my** command to view your subscription and all products.`)),
        };
      }
      return {
        ok: false,
        embed: errorEmbed(null, pick(userId, '⛔ اشتراكك منتهي', '⛔ Subscription expired'), pick(userId,
          `اشتراكك منتهي. اشتري اشتراك جديد من هنا:\n🔗 **${shop.invite}**`,
          `Your subscription expired. Buy a new one here:\n🔗 **${shop.invite}**`)),
      };
    }
  }

  const now = Date.now();
  const existing = getUserSubscription(user.id);
  const isRenew = !!(existing && existing.expiresAt > now);
  const expiresAt = isRenew ? existing.expiresAt + serial.durationMs : now + serial.durationMs;

  serial.usedAt = now;
  serial.expiresAt = expiresAt;

  // تتبع كل من استخدم السيريال (مفيد للسيريالات العامة التي يستخدمها اكثر من شخص)
  if (!Array.isArray(serial.usageList)) serial.usageList = [];
  serial.usageList.push({ userId: user.id, tag: user.tag || String(user.id), usedAt: now, expiresAt });
  serial.usedBy = user.id;

  // Public serials: don't mark as used so anyone can reuse
  if (!serial.userId) {
    serial.usedCount = (serial.usedCount || 0) + 1;
  } else {
    serial.used = true;
  }

  shop.subscriptions[user.id] = {
    key,
    activatedAt: now,
    expiresAt,
    expiryNotified: false,
  };
  saveShop(shop);

  const content = getAllProductsContent(shop);
  const title = pick(userId, isRenew ? '🔄 تم التجديد بنجاح' : '✅ تم التفعيل بنجاح', isRenew ? '🔄 Renewed successfully' : '✅ Activated successfully');
  let desc = pick(userId,
    `${isRenew ? '🔄 تم **تجديد** اشتراكك بنجاح!' : '✅ تم تفعيل اشتراكك بنجاح!'}\n\n**🎟️ اشتراك كامل في كل المنتجات**\n**السيريال:** \`${key}\`\n**المدة:** ${formatTime(serial.durationMs)}\n**ينتهي في:** ${relative(expiresAt)}`,
    `${isRenew ? '🔄 Your subscription was **renewed**!' : '✅ Your subscription was activated!'}\n\n**🎟️ Full access to all products**\n**Serial:** \`${key}\`\n**Duration:** ${formatTime(serial.durationMs)}\n**Expires:** ${relative(expiresAt)}`);
  if (content) {
    desc += `\n\n**${pick(userId, '📦 محتوى منتجاتك (كلها متاحة ليك):', '📦 Your products content (all unlocked):')}**\n${content}`;
  }

  const resEmbed = successEmbed(null, title, desc);

  if (!config.owners.includes(user.id)) {
    notifyOwner(client, user, key, serial, isRenew);
  }

  return { ok: true, embed: resEmbed, serial, expiresAt };
}

async function notifyOwner(client, user, key, serial, isRenew) {
  for (const ownerId of config.owners || []) {
    try {
      const owner = client.users.cache.get(ownerId) || (await client.users.fetch(ownerId).catch(() => null));
      if (!owner) continue;
      await owner.send({
        embeds: [embed(null, {
          title: isRenew ? '🔄 تم تجديد اشتراك' : '💰 تم تفعيل اشتراك',
          description: `**المستخدم:** ${user.tag} (<@${user.id}>)\n**الايدي:** \`${user.id}\`\n**السيريال:** \`${key}\`\n**المدة:** ${formatTime(serial.durationMs)}\n**ينتهي:** ${relative(serial.expiresAt)}`,
          color: 'success',
        })],
      });
    } catch {}
  }
}

function shopMenuRow(userId) {
  const styles = { bots: ButtonStyle.Primary, websites: ButtonStyle.Success, tools: ButtonStyle.Danger, services: ButtonStyle.Secondary };
  const catBtns = CATEGORIES.map((c) =>
    new ButtonBuilder()
      .setCustomId('shop_cat_' + c.id)
      .setLabel(pick(userId, c.ar, c.en))
      .setEmoji(c.icon)
      .setStyle(styles[c.id] || ButtonStyle.Primary));
  const myBtn = new ButtonBuilder()
    .setCustomId('shop_my')
    .setLabel(pick(userId, '📦 اشتراكي', '📦 My Subscription'))
    .setStyle(ButtonStyle.Secondary);
  return row(...catBtns, myBtn);
}

function buildShopMenu(user, guild, shopOverride) {
  const shop = shopOverride || getShop();
  const userId = user.id;
  const products = Object.values(shop.products).filter((p) => p.enabled);

  let desc;
  if (isSubscribed(userId)) {
    const sub = getUserSubscription(userId);
    desc = pick(userId,
      `✅ **انت مشترك!** كل المنتجات متاحة ليك بالكامل.\n**ينتهي اشتراكك:** ${relative(sub.expiresAt)}\n\nاختر فئة من الاسفل لعرض منتجاتك:`,
      `✅ **You are subscribed!** All products are fully available to you.\n**Subscription expires:** ${relative(sub.expiresAt)}\n\nPick a category below to view your products:`);
  } else {
    const unused = Object.values(shop.serials).filter((s) => !s.used).length;
    const cats = CATEGORIES.map((c) => `${c.icon} ${pick(userId, c.ar, c.en)}`).join(pick(userId, '، ', ', '));
    desc = pick(userId,
      `**${products.length} منتج** مقسوم على ${CATEGORIES.length} فئات: ${cats}\n\n🎟️ **اشتراك واحد بيفعّل كل المنتجات بالكامل** (حساب واحد فقط).\n**الاشتراكات المتاحة حاليا:** ${unused}\n\n⚠️ **عشان تشترك لازم تشتري سيريال من هنا:**\n🔗 **${shop.invite}**\n\n**📥 طريقة التفعيل:** بامر \`/redeem\`\n**🌐 اللغة:** \`/language\``,
      `**${products.length} products** divided into ${CATEGORIES.length} categories: ${cats}\n\n🎟️ **One subscription unlocks ALL products** (one account only).\n**Available subscriptions:** ${unused}\n\n⚠️ **To subscribe you must buy a serial from here:**\n🔗 **${shop.invite}**\n\n**📥 How to activate:** send the serial in DM or use \`/redeem\`\n**🌐 Language:** \`/language\``);
  }

  return {
    embeds: [embed(guild, {
      title: pick(userId, '🛒 متجر V9', '🛒 V9 Shop'),
      description: desc,
      footer: { text: shop.invite },
      color: 'red',
    })],
    components: [shopMenuRow(userId)],
  };
}

function buildCategoryEmbed(user, categoryId, guild, shopOverride) {
  const shop = shopOverride || getShop();
  const userId = user.id;
  const cat = getCategory(categoryId);
  const list = Object.values(shop.products).filter((p) => p.enabled && (p.category || 'tools') === cat.id);

  let desc;
  if (!list.length) {
    desc = pick(userId,
      `لا توجد منتجات في فئة ${cat.icon} ${cat.ar} حاليا، تابعنا في السيرفر!`,
      `No products in the ${cat.en} category yet, stay tuned in the server!`);
  } else {
    const owned = isSubscribed(userId);
    desc = list.map((p, i) => {
      const mark = owned ? '✅ ' : '';
      return `**${i + 1}) ${mark}${p.name}**\n${p.description}`;
    }).join('\n\n');
    desc += `\n\n**${pick(userId, '⬇️ اختر المنتج من القائمة بالاسفل لعرض التفاصيل', '⬇️ Select a product below to view details')}**`;
  }

  const select = new StringSelectMenuBuilder()
    .setCustomId('shop_prod')
    .setPlaceholder(pick(userId, '📦 اختر منتج...', '📦 Select a product...'));
  if (list.length) {
    const owned = isSubscribed(userId);
    select.addOptions(list.map((p) => new StringSelectMenuOptionBuilder()
      .setLabel((owned ? '✅ ' : '') + p.name.slice(0, 80))
      .setValue(p.id)
      .setDescription((p.description || '').slice(0, 100) || pick(userId, 'عرض التفاصيل', 'View details'))
      .setEmoji(cat.icon)));
  } else {
    select
      .setDisabled(true)
      .addOptions(new StringSelectMenuOptionBuilder()
        .setLabel(pick(userId, 'لا يوجد منتجات في هذه الفئة', 'No products in this category'))
        .setValue('none')
        .setDescription(pick(userId, 'جرب فئة اخرى', 'Try another category')));
  }

  const backRow = row(
    new ButtonBuilder().setCustomId('shop_back').setLabel(pick(userId, '⬅️ رجوع للقائمة', '⬅️ Back to menu')).setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('shop_my').setLabel(pick(userId, '📦 اشتراكي', '📦 My Subscription')).setStyle(ButtonStyle.Primary),
  );

  return {
    embeds: [embed(guild, {
      title: `${cat.icon} ${pick(userId, cat.ar, cat.en)}`,
      description: desc,
      footer: { text: shop.invite },
      color: 'red',
    })],
    components: [row(select), backRow],
  };
}

function buildProductDetail(user, productId, guild, shopOverride) {
  const shop = shopOverride || getShop();
  const userId = user.id;
  const p = shop.products[productId];

  if (!p) return buildShopMenu(user, guild, shop);

  const cat = getCategory(p.category || 'tools');
  const subscribed = isSubscribed(userId);
  const price = p.price ? `\n**${pick(userId, '💰 السعر', '💰 Price')}:** ${p.price}` : '';
  const dur = p.duration ? `\n**${pick(userId, '⏳ المدة', '⏳ Duration')}:** ${p.duration}` : '';
  const categoryLine = `\n**${pick(userId, '🗂️ الفئة', '🗂️ Category')}:** ${cat.icon} ${pick(userId, cat.ar, cat.en)}`;

  let extra;
  if (subscribed) {
    extra = pick(userId,
      `\n\n✅ **الخدمة متاحة لك الآن!**\n\n━━━━━━━━━━━━━━━━\n**🔗 تفاصيل الخدمة / طريقة الاستخدام:**\n${p.content || '_لا يوجد محتوى إضافي_'}`,
      `\n\n✅ **This service is now available to you!**\n\n━━━━━━━━━━━━━━━━\n**🔗 Service details / how to use:**\n${p.content || '_No extra content_'}`);
  } else {
    extra = pick(userId,
      `\n\n🔒 **الخدمة مقفولة** — اشتراك واحد بيفعّل كل المنتجات بالكامل.\n⚠️ **عشان تستخدم الخدمة لازم تشترك من هنا:**\n🔗 **${shop.invite}**\n\n**📥 عندك سيريال؟** فعّله بامر \`/redeem\``,
      `\n\n🔒 **Service locked** — one subscription unlocks all products.\n⚠️ **To use this service you must subscribe here:**\n🔗 **${shop.invite}**\n\n**📥 Have a serial?** Use \`/redeem\` or send it in DM`);
  }

  const extraImage = subscribed && p.image ? p.image : null;

  const backRow = row(
    new ButtonBuilder().setCustomId('shop_cat_' + cat.id).setLabel(pick(userId, `⬅️ رجوع ل${cat.icon} ${pick(userId, cat.ar, cat.en)}`, `⬅️ Back to ${cat.en}`)).setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('shop_my').setLabel(pick(userId, '📦 اشتراكي', '📦 My Subscription')).setStyle(ButtonStyle.Primary),
  );

  return {
    embeds: [embed(guild, {
      title: `${cat.icon} ${p.name}`,
      description: `${p.description}${price}${dur}${categoryLine}${extra}`,
      image: extraImage,
      footer: { text: shop.invite },
      color: 'red',
    })],
    components: [backRow],
  };
}

function buildSubscriptionEmbed(user, guild, shopOverride) {
  const shop = shopOverride || getShop();
  const userId = user.id;
  const sub = getUserSubscription(userId);
  const embeds = [];
  let desc;

  if (!sub) {
    desc = pick(userId,
      `لا يوجد اشتراك مفعل عندك حتى الان.\n\n⚠️ **عشان تشترك لازم تشتري سيريال من هنا:**\n🔗 **${shop.invite}**\n\nبعد ما تشتريه فعّله بامر \`/redeem\``,
      `You don't have an active subscription yet.\n\n⚠️ **To subscribe you must buy a serial from here:**\n🔗 **${shop.invite}**\n\nAfter buying it, send it here in DM or type \`/redeem\``);
    embeds.push(embed(guild, {
      title: pick(userId, '📦 اشتراكي', '📦 My Subscription'),
      description: desc,
      footer: { text: shop.invite },
      color: 'red',
    }));
  } else {
    const active = sub.expiresAt > Date.now();
    desc = pick(userId,
      `${active ? '🟢 **اشتراكك مفعل**' : '🔴 **اشتراكك منتهي**'}\n**السيريال:** \`${sub.key}\`\n**فُعل:** ${relative(sub.activatedAt)}\n**ينتهي:** ${relative(sub.expiresAt)}`,
      `${active ? '🟢 **Subscription active**' : '🔴 **Subscription expired**'}\n**Serial:** \`${sub.key}\`\n**Activated:** ${relative(sub.activatedAt)}\n**Expires:** ${relative(sub.expiresAt)}`);
    embeds.push(embed(guild, {
      title: pick(userId, '📦 اشتراكي', '📦 My Subscription'),
      description: desc,
      footer: { text: shop.invite },
      color: active ? 'success' : 'red',
    }));

    if (active) {
      for (const p of Object.values(shop.products)) {
        if (!p.enabled) continue;
        if (embeds.length >= 10) break;
        const body = p.content || p.description || '_لا يوجد محتوى إضافي_';
        embeds.push(embed(guild, {
          title: `📦 ${p.name}`,
          description: `━━━━━━━━━━━━━━━━\n${body}\n━━━━━━━━━━━━━━━━`,
          image: p.image || null,
          color: 'success',
        }));
      }
    }
  }

  const components = isSubscribed(userId) ? [shopMenuRow(userId)] : [];

  return {
    embeds,
    components,
  };
}

function buildWelcomeEmbed(user, guild, shopOverride) {
  const shop = shopOverride || getShop();
  const userId = user.id;

  if (isSubscribed(userId)) {
    return buildSubscriptionEmbed(user, guild, shop);
  }

  const desc = pick(userId,
    `السلام عليكم **${user.username}** 👋\n\n⚠️ **عشان تشترك في الخدمات لازم تشتري سيريال من هنا:**\n🔗 **${shop.invite}**\n\n**🛍️ لعرض المنتجات:** \`/shop\`\n**🔑 عندك سيريال؟** فعّله بامر \`/redeem\`\n**📦 لعرض اشتراكك:** \`/my\`\n**❓ لعرض الاوامر المتاحة:** \`/help\`\n**🌐 لتغيير اللغة:** \`/language\`\n\nبعد ما تشتري الاشتراك من السيرفر، فعّله بامر \`/redeem\` وهتاخد **كل المنتجات** فورا ✅`,
    `Welcome **${user.username}** 👋\n\n⚠️ **To use our services you must buy a subscription serial from here:**\n🔗 **${shop.invite}**\n\n**🛍️ Products:** \`/shop\`\n**🔑 Have a serial?** \`/redeem\`\n**📦 Your subscription:** \`/my\`\n**❓ Help:** \`/help\`\n**🌐 Change language:** \`/language\`\n\nAfter buying a subscription from the server, activate it with \`/redeem\` and you'll get **all products** instantly ✅`);

  return {
    embeds: [embed(guild, {
      title: pick(userId, '👋 اهلا بك في V9 Shop', '👋 Welcome to V9 Shop'),
      description: desc,
      footer: { text: shop.invite },
      color: 'red',
    })],
    components: [shopMenuRow(userId)],
  };
}

async function handleDM(client, message) {
  if (message.author.bot) return;
  const content = (message.content || '').trim();
  const userId = message.author.id;

  if (!content) {
    logger.warn('[DM] رسالة بدون محتوى (Message Content Intent ممكن يكون مقفول)');
    return message.channel.send(buildWelcomeEmbed(message.author)).catch(() => {});
  }

  return message.channel.send({
    embeds: [errorEmbed(null, pick(userId, '❌ أمر غير معروف', '❌ Unknown command'), pick(userId,
      'الاوامر متاحة فقط كسلاش كوماند في الخاص.\n\nاكتب **`/help`** لعرض كل الاوامر المتاحة لك.\n\n🔑 عندك سيريال؟ استخدم امر **`/redeem`** لتفعيله.',
      'Commands are only available as slash commands in DMs.\n\nType **`/help`** to see all available commands.\n\n🔑 Have a serial? Use **`/redeem`** to activate it.'))],
  }).catch(() => {});
}

function formatSerialList(serials, shop) {
  if (!serials.length) return '_لا توجد سيريالات_';
  return serials
    .map((s) => {
      const status = s.used
        ? '🔴 مستخدم'
        : '🟢 متاح';
      const owner = s.userId ? `<@${s.userId}>` : '🌐 العامة';
      return `\`${s.key}\` | **${owner}** | ${status} | ${s.used ? `<@${s.usedBy}>` : '—'} | ${formatTime(s.durationMs)} | ${relative(s.createdAt)}`;
    })
    .join('\n');
}

async function checkExpiredSubscriptions(client) {
  const shop = getShop();
  const now = Date.now();
  let changed = false;
  const subs = shop.subscriptions;
  for (const userId of Object.keys(subs)) {
    const sub = subs[userId];
    if (!sub || !sub.expiresAt || sub.expiresAt > now) continue;
    if (sub.expiryNotified) continue;
    sub.expiryNotified = true;
    changed = true;
    try {
      const user = client.users.cache.get(userId) || (await client.users.fetch(userId).catch(() => null));
      if (!user) continue;
      const dm = user.dmChannel || (await user.createDM().catch(() => null));
      if (!dm) continue;
      const desc = pick(userId,
        `اشتراكك في متجر **V9** انتهى 🔴\n\n🎟️ **عشان تجدد اشتراكك** كل اللي عليك انك تشتري سيريال جديد من هنا:\n🔗 **${shop.invite}**\n\n**📥 طريقة التجديد:**\n1️⃣ اشترِ السيريال من سيرفرنا\n2️⃣ فعّله بامر \`/redeem\` او ارسله في الخاص\n\n✅ بعد التفعيل هيشتغل اشتراكك فوراً مع **كل المنتجات**\n\n📦 لعرض اشتراكك: \`/my\`\n🛍️ لعرض المنتجات: \`/shop\``,
        `Your **V9** subscription has expired 🔴\n\n🎟️ **To renew your subscription** all you need is to buy a new serial here:\n🔗 **${shop.invite}**\n\n**📥 How to renew:**\n1️⃣ Buy the serial from our server\n2️⃣ Activate it with \`/redeem\` or send it in DM\n\n✅ After activation your subscription restarts with **all products**\n\n📦 View your subscription: \`/my\`\n🛍️ Browse products: \`/shop\``);
      await dm.send({ embeds: [warnEmbed(null, pick(userId, '🔴 انتهى اشتراكك', '🔴 Your subscription expired'), desc)] }).catch(() => null);
      logger.info(`[subscription] تم ابلاغ ${user.tag} (${userId}) بانتهاء اشتراكه`);
    } catch {}
  }
  if (changed) saveShop(shop);
}

async function sendSerialToUser(client, user, key) {
  const shop = getShop();
  const serial = getSerial(key);
  if (!serial) return { ok: false, reason: 'serial_not_found' };

  if (serial.userId !== user.id) {
    return { ok: false, reason: 'wrong_user' };
  }

  const status = serial.used
    ? pick(user.id, `✅ **مفعل بالفعل** — ينتهي: ${relative(serial.expiresAt)}`, `✅ **Already activated** — expires: ${relative(serial.expiresAt)}`)
    : pick(user.id, '🟢 **جاهز للتفعيل**', '🟢 **Ready to activate**');

  const desc = pick(user.id,
    `🎟️ **سيريال الاشتراك الخاص بك جاهز!**\n\n🔑 **السيريال:** \`${serial.key}\`\n**المدة:** ${formatTime(serial.durationMs)}\n**الحالة:** ${status}\n\n━━━━━━━━━━━━━━━━\n**📥 طريقة التفعيل (خطوة بخطوة):**\n1️⃣ اضغط على اسم البوت في الشات (يمين/اعلى)\n2️⃣ اضغط **Message** لفتح الخاص مع البوت\n3️⃣ اكتب \`/redeem\` وادخل السيريال:\n\`${serial.key}\`\n4️⃣ اضغط Enter وسيتم تفعيل اشتراكك فوراً ✅\n\n━━━━━━━━━━━━━━━━\n**📦 بعد التفعيل هيفتح لك كل المنتجات بالكامل.**\n🛍️ لعرض المنتجات: \`/shop\`\n📦 لعرض اشتراكك ومحتواه: \`/my\`\n\n⚠️ **السيريال مخصص لحسابك أنت فقط** — لا تشاركه مع أحد.\n🔗 **سيرفر الدعم:** ${shop.invite}`,
    `🎟️ **Your subscription serial is ready!**\n\n🔑 **Serial:** \`${serial.key}\`\n**Duration:** ${formatTime(serial.durationMs)}\n**Status:** ${status}\n\n━━━━━━━━━━━━━━━━\n**📥 How to activate (step by step):**\n1️⃣ Click on the bot's name in the chat (right/top)\n2️⃣ Click **Message** to open a DM with the bot\n3️⃣ Type \`/redeem\` and enter the serial:\n\`${serial.key}\`\n4️⃣ Press Enter and your subscription activates instantly ✅\n\n━━━━━━━━━━━━━━━━\n**📦 After activation, ALL products are unlocked for you.**\n🛍️ Browse products: \`/shop\`\n📦 View your subscription & content: \`/my\`\n\n⚠️ **This serial is for YOUR account only** — don't share it.\n🔗 **Support server:** ${shop.invite}`);

  const dmChannel = user.dmChannel || await user.createDM().catch(() => null);
  if (!dmChannel) return { ok: false, reason: 'dm_closed' };

  await dmChannel.send({ embeds: [successEmbed(null, pick(user.id, '🎟️ سيريال اشتراكك', '🎟️ Your subscription serial'), desc)] }).catch(() => null);
  return { ok: true };
}

module.exports = {
  SERVER_INVITE,
  SERIAL_REGEX,
  CATEGORIES,
  getShop,
  saveShop,
  makeSerialKey,
  findProduct,
  createProduct,
  deleteProduct,
  toggleProduct,
  createSerials,
  deleteSerial,
  getSerial,
  listSerials,
  getUserSubscription,
  isSubscribed,
  getAllProductsContent,
  redeemSerial,
  sendSerialToUser,
  checkExpiredSubscriptions,
  buildShopMenu,
  buildCategoryEmbed,
  buildProductDetail,
  buildSubscriptionEmbed,
  buildWelcomeEmbed,
  handleDM,
  formatSerialList,
};
