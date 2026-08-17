const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { embed, successEmbed, errorEmbed, row, ButtonBuilder, ButtonStyle } = require('../../utils/embed');
const { t } = require('../../utils/i18n');
const { getEvents, clearEvents, formatEvent } = require('../../services/serverLog');

const FILTERS = {
  all: ['role_create', 'role_delete', 'channel_create', 'channel_delete', 'category_create', 'category_delete'],
  roles: ['role_create', 'role_delete'],
  channels: ['channel_create', 'channel_delete'],
  categories: ['category_create', 'category_delete'],
};

function renderLog(guild, userId, sub) {
  const l = userId;
  const filter = FILTERS[sub] || FILTERS.all;
  const events = getEvents(guild.id, filter);

  if (!events.length) {
    return { embeds: [embed(guild, {
      title: '📋 سجل النشاط',
      description: t(l, 'sl_no_events'),
      color: 'info',
    })], components: [] };
  }

  const lines = events.slice(0, 15).map((e) => {
    e.lang = t(l, 'sl_stats') === 'Stats' ? 'en' : 'ar';
    return formatEvent(e);
  });

  const total = events.length;
  const summary = events.reduce((acc, e) => {
    acc[e.type] = (acc[e.type] || 0) + 1;
    return acc;
  }, {});

  const stats = [
    `🎭 ${t(l, 'sl_roles')}: ${(summary.role_create || 0) + (summary.role_delete || 0)}`,
    `📂 ${t(l, 'sl_channels')}: ${(summary.channel_create || 0) + (summary.channel_delete || 0)}`,
    `📁 ${t(l, 'sl_categories')}: ${(summary.category_create || 0) + (summary.category_delete || 0)}`,
  ].join(' | ');

  const buttons = row(
    new ButtonBuilder().setCustomId('sl_all').setLabel(t(l, 'sl_btn_all')).setStyle(sub === 'all' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('sl_roles').setLabel(t(l, 'sl_btn_roles')).setStyle(sub === 'roles' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('sl_channels').setLabel(t(l, 'sl_btn_channels')).setStyle(sub === 'channels' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('sl_categories').setLabel(t(l, 'sl_btn_categories')).setStyle(sub === 'categories' ? ButtonStyle.Primary : ButtonStyle.Secondary),
  );

  const desc = `**${t(l, 'sl_stats')}:** ${stats}\n\n${lines.join('\n')}${total > 15 ? `\n\n... +${total - 15} ${t(l, 'sl_more')}` : ''}`;

  return {
    embeds: [embed(guild, { title: '📋 سجل النشاط', description: desc, color: 'info' })],
    components: [buttons],
  };
}

const FILTER_LABELS = {
  all: { ar: 'الكل', en: 'All' },
  roles: { ar: 'الرولات', en: 'Roles' },
  channels: { ar: 'القنوات', en: 'Channels' },
  categories: { ar: 'الكاتيجوريات', en: 'Categories' },
};

module.exports = {
  category: 'moderation',
  descEn: 'View server activity log — creations and deletions',
  data: new SlashCommandBuilder()
    .setName('serverlog')
    .setDescription('سجل نشاط السيرفر')
    .setDescriptionLocalizations({ 'en-US': 'Server activity log' })
    .setDefaultMemberPermissions(8)
    .addSubcommand((s) =>
      s.setName('all').setDescription('كل الأحداث').setDescriptionLocalizations({ 'en-US': 'All events' })
    )
    .addSubcommand((s) =>
      s.setName('roles').setDescription('الرولات فقط').setDescriptionLocalizations({ 'en-US': 'Roles only' })
    )
    .addSubcommand((s) =>
      s.setName('channels').setDescription('القنوات فقط').setDescriptionLocalizations({ 'en-US': 'Channels only' })
    )
    .addSubcommand((s) =>
      s.setName('categories').setDescription('الكاتيجوريات فقط').setDescriptionLocalizations({ 'en-US': 'Categories only' })
    )
    .addSubcommand((s) =>
      s.setName('clear').setDescription('مسح السجل').setDescriptionLocalizations({ 'en-US': 'Clear log' })
    ),
  async run(client, interaction) {
    const l = interaction.user.id;
    const sub = interaction.options.getSubcommand();

    if (sub === 'clear') {
      clearEvents(interaction.guild.id);
      return interaction.reply({ embeds: [successEmbed(interaction.guild, '🗑️', t(l, 'sl_cleared'))] });
    }

    const result = renderLog(interaction.guild, l, sub);
    await interaction.reply(result);
  },
  components: {
    sl_all: async (client, interaction) => {
      await interaction.update(renderLog(interaction.guild, interaction.user.id, 'all'));
    },
    sl_roles: async (client, interaction) => {
      await interaction.update(renderLog(interaction.guild, interaction.user.id, 'roles'));
    },
    sl_channels: async (client, interaction) => {
      await interaction.update(renderLog(interaction.guild, interaction.user.id, 'channels'));
    },
    sl_categories: async (client, interaction) => {
      await interaction.update(renderLog(interaction.guild, interaction.user.id, 'categories'));
    },
  },
};
