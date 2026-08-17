const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { embed, row } = require('../../utils/embed');
const { isOwner } = require('../../utils/functions');
const { t } = require('../../utils/i18n');

const CATEGORY_KEYS = ['info', 'moderation', 'config', 'protection', 'tickets', 'shop', 'owner'];

const CATEGORY_LABELS = {
  info: { ar: 'ℹ️ معلومات', en: 'ℹ️ Info' },
  moderation: { ar: '🛠️ إدارة', en: '🛠️ Moderation' },
  config: { ar: '⚙️ إعدادات', en: '⚙️ Settings' },
  protection: { ar: '🛡️ حماية', en: '🛡️ Protection' },
  tickets: { ar: '🎫 تذاكر', en: '🎫 Tickets' },
  shop: { ar: '🛒 متجر', en: '🛒 Shop' },
  owner: { ar: '👑 مطور', en: '👑 Owner' },
};

const CATEGORY_DESC = {
  info: { ar: 'معلومات عامة: بنج، سيرفر، افك والمزيد', en: 'General info: ping, server, AFK & more' },
  moderation: { ar: 'إدارة الأعضاء والرومات الصوتية المؤقتة', en: 'Member management & temp voice rooms' },
  config: { ar: 'إعدادات السيرفر: لوجات، اقتراحات، احالات', en: 'Server setup: logs, suggestions, referrals' },
  protection: { ar: 'نظام الحماية من السبام والريد والنيوك', en: 'Anti-spam, anti-raid & anti-nuke' },
  tickets: { ar: 'نظام تذاكر احترافي للدعم والشكاوى', en: 'Professional support tickets' },
  shop: { ar: 'متجر المنتجات والسيريالات والاشتراكات', en: 'Products, serials & subscriptions' },
  owner: { ar: 'أوامر مطور البوت الخاصة', en: 'Bot developer commands' },
};

function canSee(c, userId) {
  if (c.devOnly || c.ownerOnly) return isOwner(userId);
  return true;
}

function catLang(userId) {
  const { getLang } = require('../../utils/i18n');
  return getLang(userId) === 'en' ? 'en' : 'ar';
}

function categoryLabel(key, lang) {
  return CATEGORY_LABELS[key]?.[lang] || key;
}

function categoryDesc(key, lang) {
  return CATEGORY_DESC[key]?.[lang] || '';
}

module.exports = {
  category: 'info',
  descEn: 'Browse all commands by category',
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('عرض كل الأوامر مقسمة على فئات')
    .setDescriptionLocalizations({ 'en-US': 'Browse all commands by category' }),
  cooldown: 5000,
  async run(client, interaction) {
    if (!interaction.guild) {
      return interaction.reply(buildDmHelp(client, interaction));
    }
    await interaction.reply({ embeds: [buildMainEmbed(client, interaction)], components: buildCategoryButtons(client, interaction) });
  },
};

const DM_COMMANDS = ['shop', 'redeem', 'my', 'help', 'language'];

function buildDmHelp(client, interaction) {
  const lang = interaction.user.id;
  const cmds = DM_COMMANDS.map((n) => client.commands.get(n)).filter(Boolean);
  const desc = cmds.map((c, i) => commandLine(c, i + 1, lang)).join('\n\n');
  return {
    embeds: [embed(null, {
      title: t(lang, 'shop_dm_title'),
      description: [
        t(lang, 'shop_dm_desc'),
        '',
        desc,
      ].join('\n'),
      color: 'red',
    })],
  };
}

function getVisibleCategories(client, userId) {
  const byCat = {};
  for (const c of client.commands.values()) {
    if (!canSee(c, userId)) continue;
    const cat = c.category || 'other';
    (byCat[cat] = byCat[cat] || []).push(c);
  }
  const keys = [...new Set([...CATEGORY_KEYS, ...Object.keys(byCat)])];
  const cats = [];
  for (const key of keys) {
    if (byCat[key]?.length) cats.push({ key, cmds: byCat[key] });
  }
  return cats;
}

function countAll(client, userId) {
  return [...client.commands.values()].filter((c) => canSee(c, userId)).length;
}

function buildMainEmbed(client, interaction) {
  const lang = interaction.user.id;
  const al = catLang(lang);
  const cats = getVisibleCategories(client, lang);
  const total = countAll(client, lang);

  const fields = cats.map((c) => ({
    name: `${categoryLabel(c.key, al)} — ${c.cmds.length} ${t(lang, 'help_commands_count', '').replace(/^\d+\s*/, '').trim() || (al === 'en' ? 'commands' : 'أمر')}`,
    value: categoryDesc(c.key, al) || (al === 'en' ? 'Server commands' : 'أوامر السيرفر'),
    inline: false,
  }));

  return embed(interaction.guild, {
    title: t(lang, 'help_title'),
    description: [
      al === 'en' ? 'Welcome to **V9 Bot** 👋' : 'أهلاً بك في **V9 Bot** 👋',
      al === 'en' ? 'Your all-in-one server management, protection & automation' : 'مركز متكامل لإدارة سيرفرك وحمايته وتنظيمه',
      '',
      `**${al === 'en' ? '📊 Total commands' : '📊 إجمالي الأوامر'}:** ${total}`,
      '',
      al === 'en' ? '⬇️ Select a category below to browse its commands' : '⬇️ اختر فئة من الأزرار بالأسفل لاستعراض أوامرها',
    ].join('\n'),
    fields,
    footer: { text: al === 'en' ? "Sorry for the interruption — for any inquiry, please reach us via DMs or the support room 🙏" : 'نأسف على الإزعاج — لأي استفسار يُرجى القدوم إلى الخاص أو روم الدعم 🙏' },
  });
}

function buildCategoryButtons(client, interaction) {
  const lang = interaction.user.id;
  const al = catLang(lang);
  const cats = getVisibleCategories(client, lang);
  const buttons = cats.map((c) =>
    new ButtonBuilder()
      .setCustomId(`help_cat_${c.key}`)
      .setLabel(categoryLabel(c.key, al))
      .setStyle(ButtonStyle.Secondary)
  );
  const rows = [];
  for (let i = 0; i < buttons.length; i += 5) {
    rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 5)));
  }
  return rows;
}

function commandLine(cmd, index, lang) {
  const al = catLang(lang);
  const en = cmd.descEn;
  const desc = al === 'en' ? (en || cmd.data.description) : cmd.data.description;
  return `**\`${index}. /${cmd.data.name}\`**\n${desc}`;
}

async function handleHelpButton(client, interaction) {
  const id = interaction.customId;
  const lang = interaction.user.id;
  const al = catLang(lang);

  if (id === 'help_back') {
    return interaction.update({ embeds: [buildMainEmbed(client, interaction)], components: buildCategoryButtons(client, interaction) });
  }

  if (id.startsWith('help_cat_')) {
    const key = id.replace('help_cat_', '');
    const cmds = [...client.commands.values()].filter((c) => c.category === key && canSee(c, lang));
    const catEmbed = embed(interaction.guild, {
      title: `📂 ${categoryLabel(key, al)} — ${cmds.length} ${al === 'en' ? 'commands' : 'أمر'}`,
      description: cmds.map((c, i) => commandLine(c, i + 1, lang)).join('\n\n'),
      footer: { text: al === 'en' ? "Sorry for the interruption — for any inquiry, please reach us via DMs 🙏" : 'نأسف على الإزعاج — لأي استفسار يُرجى القدوم إلى الخاص 🙏' },
    });

    const back = new ButtonBuilder().setCustomId('help_back').setLabel(al === 'en' ? '↩️ Back to main' : '↩️ العودة للرئيسية').setStyle(ButtonStyle.Primary);
    return interaction.update({ embeds: [catEmbed], components: [new ActionRowBuilder().addComponents(back)] });
  }

  await interaction.reply({ content: 'unknown', ephemeral: true });
}

module.exports.components = {
  'help_cat_*': handleHelpButton,
  'help_back': handleHelpButton,
};
