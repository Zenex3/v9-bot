const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { embed, successEmbed, errorEmbed } = require('../../utils/embed');
const { db } = require('../../utils/database');
const { L } = require('../../utils/i18n');

function getConfig(guildId) {
  return db.guilds.ensure(guildId, 'autoreact', {});
}

module.exports = {
  category: 'config',
  descEn: 'Auto-react on every message in a channel',
  data: new SlashCommandBuilder()
    .setName('autoreact')
    .setDescription('رياكشن تلقائي على كل رسالة في الروم')
    .setDescriptionLocalizations({ 'en-US': 'Auto-react on every message in a channel' })
    .setDefaultMemberPermissions(8)
    .addSubcommand((s) => s.setName('add').setDescription(L('x', 'اضافة رياكشن تلقائي لروم', 'Add auto-reactions to a channel')).setDescriptionLocalizations({ 'en-US': 'Add auto-reactions to a channel' }).addChannelOption((o) => o.setName('channel').setDescription(L('x', 'الروم', 'Channel')).setDescriptionLocalizations({ 'en-US': 'Channel' }).addChannelTypes(ChannelType.GuildText).setRequired(true)).addStringOption((o) => o.setName('emojis').setDescription(L('x', 'الرياكشنات — يفضل ان تكون واحدة', 'Reactions — prefer a single one')).setDescriptionLocalizations({ 'en-US': 'Reactions — prefer a single one' }).setRequired(true)))
    .addSubcommand((s) => s.setName('remove').setDescription(L('x', 'ازالة الرياكشن التلقائي من روم', 'Remove auto-reactions from a channel')).setDescriptionLocalizations({ 'en-US': 'Remove auto-reactions from a channel' }).addChannelOption((o) => o.setName('channel').setDescription(L('x', 'الروم', 'Channel')).setDescriptionLocalizations({ 'en-US': 'Channel' }).addChannelTypes(ChannelType.GuildText).setRequired(true)))
    .addSubcommand((s) => s.setName('list').setDescription(L('x', 'عرض الرومات ذات الرياكشن التلقائي', 'List channels with auto-reactions')).setDescriptionLocalizations({ 'en-US': 'List channels with auto-reactions' })),
  botPermissions: [PermissionFlagsBits.AddReactions],
  async run(client, interaction) {
    const l = interaction.user.id;
    const sub = interaction.options.getSubcommand();

    if (sub === 'add') {
      const channel = interaction.options.getChannel('channel');
      const emojisInput = interaction.options.getString('emojis');
      const emojis = emojisInput.split(/\s+/).filter(Boolean).slice(0, 5);
      const config = getConfig(interaction.guild.id);
      config[channel.id] = emojis;
      db.guilds.set(interaction.guild.id, 'autoreact', config);
      return interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '✅ تم الحفظ', '✅ Saved'), L(l, `سيتم اضافة ${emojis.join(' ')} على كل رسالة في ${channel}`, `Will react ${emojis.join(' ')} on every message in ${channel}`))] });
    }

    if (sub === 'remove') {
      const channel = interaction.options.getChannel('channel');
      const config = getConfig(interaction.guild.id);
      if (!config[channel.id]) {
        return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'لا يوجد رياكشن تلقائي لهذا الروم', 'No auto-reaction configured for this channel'))], ephemeral: true });
      }
      delete config[channel.id];
      db.guilds.set(interaction.guild.id, 'autoreact', config);
      return interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '✅ تم الحذف', '✅ Removed'), L(l, `تم ازالة الرياكشن التلقائي من ${channel}`, `Removed auto-reactions from ${channel}`))] });
    }

    const config = getConfig(interaction.guild.id);
    const entries = Object.entries(config).filter(([id, reacts]) => reacts.length && interaction.guild.channels.cache.has(id));
    if (!entries.length) {
      return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'لا توجد رومات برياكشن تلقائي', 'No channels with auto-reactions'))], ephemeral: true });
    }
    const lines = entries.map(([id, reacts]) => `${interaction.guild.channels.cache.get(id)} → ${reacts.join(' ')}`);
    return interaction.reply({ embeds: [embed(interaction.guild, { title: L(l, '⚡ الرياكشن التلقائي', '⚡ Auto-reactions'), description: lines.join('\n') })] });
  },
};
