const { SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const { embed, successEmbed, errorEmbed } = require('../../utils/embed');
const { getConfig, getRecords, applyVote, SUGGEST_PREFIX } = require('../../services/suggestionService');
const { db } = require('../../utils/database');
const { t } = require('../../utils/i18n');

module.exports = {
  category: 'config',
  descEn: 'Suggestion system — messages in the channel become vote embeds',
  data: new SlashCommandBuilder()
    .setName('suggest')
    .setDescription('نظام الاقتراحات — رسائل الروم تتحول لايمبيدات تصويت')
    .setDescriptionLocalizations({ 'en-US': 'Suggestion system — channel messages become vote embeds' })
    .setDefaultMemberPermissions(8)
    .addSubcommand((s) => s.setName('setup').setDescription('تفعيل النظام').setDescriptionLocalizations({ 'en-US': 'Enable the system' }).addChannelOption((o) => o.setName('channel').setDescription('روم الاقتراحات').setDescriptionLocalizations({ 'en-US': 'Suggestions channel' }).addChannelTypes(ChannelType.GuildText).setRequired(true)))
    .addSubcommand((s) => s.setName('disable').setDescription('ايقاف النظام').setDescriptionLocalizations({ 'en-US': 'Disable the system' }))
    .addSubcommand((s) => s.setName('status').setDescription('عرض حالة النظام').setDescriptionLocalizations({ 'en-US': 'Show system status' })),
  components: {
    'suggest_vote_*': handleSuggestionVote,
  },
  async run(client, interaction) {
    const l = interaction.user.id;
    const guild = interaction.guild;
    const sub = interaction.options.getSubcommand();
    const cfg = getConfig(guild.id);

    if (sub === 'setup') {
      const channel = interaction.options.getChannel('channel');
      cfg.enabled = true;
      cfg.channel = channel.id;
      db.guilds.set(guild.id, 'suggest', cfg);
      return interaction.reply({ embeds: [successEmbed(guild, t(l, 'sug_enabled_title'), t(l, 'sug_enabled_desc', channel))] });
    }

    if (sub === 'disable') {
      cfg.enabled = false;
      db.guilds.set(guild.id, 'suggest', cfg);
      return interaction.reply({ embeds: [successEmbed(guild, t(l, 'sug_disabled_title'), t(l, 'sug_disabled_desc'))] });
    }

    if (sub === 'status') {
      const records = getRecords(guild.id);
      const count = Object.keys(records).length;
      return interaction.reply({
        embeds: [embed(guild, {
          title: t(l, 'sug_status_title'),
          fields: [
            { name: t(l, 'sug_status'), value: cfg.enabled ? `✅ ${t(l, 'sug_enabled_state')}` : `❌ ${t(l, 'sug_disabled_state')}`, inline: true },
            { name: t(l, 'sug_channel_label'), value: cfg.channel ? `<#${cfg.channel}>` : '—', inline: true },
            { name: t(l, 'sug_count'), value: String(count), inline: true },
          ],
          color: 'info',
        })],
      });
    }
  },
};

async function handleSuggestionVote(client, interaction) {
  const l = interaction.user.id;
  const rest = interaction.customId.slice(SUGGEST_PREFIX.length);
  let dir = null;
  if (rest.startsWith('up_')) dir = 'up';
  else if (rest.startsWith('down_')) dir = 'down';
  if (!dir) return interaction.reply({ content: t(l, 'unknown_interaction'), ephemeral: true });

  const suggestionId = rest.slice(dir.length + 1);
  const res = await applyVote(interaction.guild, interaction, suggestionId, dir);
  if (res.error === 'not_found') {
    return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', t(l, 'sug_not_found'))], ephemeral: true });
  }
  return interaction.reply({ embeds: [successEmbed(interaction.guild, t(l, 'sug_voted_title'), t(l, 'sug_voted_desc'))], ephemeral: true });
}
