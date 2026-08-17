const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embed');
const { db } = require('../../utils/database');
const { L } = require('../../utils/i18n');

const COUNTERS = [
  { id: 'members', ar: 'الاعضاء', en: 'Members', label: '👥' },
  { id: 'humans', ar: 'الاعضاء الحقيقيين', en: 'Humans', label: '🧑' },
  { id: 'bots', ar: 'البوتات', en: 'Bots', label: '🤖' },
  { id: 'boosts', ar: 'البوستات', en: 'Boosts', label: '🚀' },
];

async function updateCounters(guild) {
  const stats = db.guilds.ensure(guild.id, 'statChannels', []);
  if (!stats.length) return;
  const counts = {
    members: guild.memberCount,
    humans: guild.members.cache.filter((m) => !m.user.bot).size,
    bots: guild.members.cache.filter((m) => m.user.bot).size,
    boosts: guild.premiumSubscriptionCount || 0,
  };
  for (const s of stats) {
    const ch = guild.channels.cache.get(s.channelId);
    if (!ch) continue;
    const label = COUNTERS.find((c) => c.id === s.type)?.label || '';
    await ch.setName(`${label} ${counts[s.type] ?? 0} | ${s.name || ''}`.slice(0, 100)).catch(() => null);
  }
}

module.exports = {
  updateCounters,
  category: 'config',
  descEn: 'Voice channel counters for members and boosts',
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('عدادات صوتية لعدد الاعضاء')
    .setDescriptionLocalizations({ 'en-US': 'Voice channel counters' })
    .setDefaultMemberPermissions(8)
    .addSubcommand((s) => s.setName('create').setDescription(L('x', 'انشاء عداد', 'Create a counter')).setDescriptionLocalizations({ 'en-US': 'Create a counter' })
      .addStringOption((o) => o.setName('type').setDescription(L('x', 'نوع العداد', 'Counter type')).setDescriptionLocalizations({ 'en-US': 'Counter type' }).setRequired(true).addChoices(
        { name: '👥 ' + L('x', 'الاعضاء', 'Members'), value: 'members' },
        { name: '🧑 ' + L('x', 'الاعضاء الحقيقيين', 'Humans'), value: 'humans' },
        { name: '🤖 ' + L('x', 'البوتات', 'Bots'), value: 'bots' },
        { name: '🚀 ' + L('x', 'البوستات', 'Boosts'), value: 'boosts' }))
      .addChannelOption((o) => o.setName('category').setDescription(L('x', 'الكاتيجوري (اختياري)', 'Category (optional)')).setDescriptionLocalizations({ 'en-US': 'Category (optional)' })))
    .addSubcommand((s) => s.setName('remove').setDescription(L('x', 'حذف جميع العدادات', 'Remove all counters')).setDescriptionLocalizations({ 'en-US': 'Remove all counters' })),
  async run(client, interaction) {
    const l = interaction.user.id;
    const sub = interaction.options.getSubcommand();
    const stats = db.guilds.ensure(interaction.guild.id, 'statChannels', []);

    if (sub === 'create') {
      const type = interaction.options.getString('type');
      const category = interaction.options.getChannel('category');
      if (stats.length >= 4) return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'الحد الاقصى 4 عدادات', 'Maximum 4 counters'))], ephemeral: true });
      if (stats.some((s) => s.type === type)) return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'هذا العداد موجود بالفعل', 'This counter already exists'))], ephemeral: true });

      const conf = COUNTERS.find((c) => c.id === type);
      const channel = await interaction.guild.channels.create({
        name: `${conf.label} 0`,
        type: 2,
        parent: category?.id || null,
        permissionOverwrites: [{ id: interaction.guild.id, deny: ['Connect'] }],
        reason: 'Stats counter',
      });
      stats.push({ type, channelId: channel.id, name: '' });
      db.guilds.set(interaction.guild.id, 'statChannels', stats);
      await updateCounters(interaction.guild);
      return interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '✅ تم', '✅ Done'), L(l, `تم انشاء عداد ${conf.ar}: ${channel}`, `Created ${conf.en} counter: ${channel}`))] });
    }

    if (sub === 'remove') {
      for (const s of stats) {
        const ch = interaction.guild.channels.cache.get(s.channelId);
        if (ch) await ch.delete('Remove stats counter').catch(() => null);
      }
      db.guilds.set(interaction.guild.id, 'statChannels', []);
      return interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '✅ تم', '✅ Done'), L(l, `تم حذف **${stats.length}** عداد`, `Deleted **${stats.length}** counters`))] });
    }
  },
};
