const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { embed, successEmbed, errorEmbed } = require('../../utils/embed');
const { getConfig, setConfig } = require('../../services/tempVoiceService');
const { t } = require('../../utils/i18n');

module.exports = {
  category: 'moderation',
  descEn: 'Temporary voice rooms — join the create channel to get your own room',
  data: new SlashCommandBuilder()
    .setName('tempvoice')
    .setDescription('الرومات الصوتية المؤقتة')
    .setDescriptionLocalizations({ 'en-US': 'Temporary voice rooms' })
    .setDefaultMemberPermissions(8)
    .addSubcommand((s) => s.setName('setup').setDescription('تفعيل النظام').setDescriptionLocalizations({ 'en-US': 'Enable the system' })
      .addChannelOption((o) => o.setName('category').setDescription('الكاتيجوري').setDescriptionLocalizations({ 'en-US': 'Category' }).addChannelTypes(ChannelType.GuildCategory).setRequired(true))
      .addChannelOption((o) => o.setName('channel').setDescription('روم الانشاء — اتركه فاضي لعمل واحد تلقائي').setDescriptionLocalizations({ 'en-US': 'Create channel — leave empty to auto-create one' }).addChannelTypes(ChannelType.GuildVoice))
      .addIntegerOption((o) => o.setName('limit').setDescription('الحد الاقصى (0 = بدون حد)').setDescriptionLocalizations({ 'en-US': 'Max members (0 = unlimited)' })))
    .addSubcommand((s) => s.setName('disable').setDescription('ايقاف النظام').setDescriptionLocalizations({ 'en-US': 'Disable the system' }))
    .addSubcommand((s) => s.setName('status').setDescription('عرض حالة النظام').setDescriptionLocalizations({ 'en-US': 'Show system status' })),
  async run(client, interaction) {
    const l = interaction.user.id;
    const guild = interaction.guild;
    const sub = interaction.options.getSubcommand();

    if (sub === 'setup') {
      const category = interaction.options.getChannel('category');
      const existingChannel = interaction.options.getChannel('channel');
      let createChannel = existingChannel;

      if (createChannel && createChannel.type !== ChannelType.GuildVoice) {
        return interaction.reply({ embeds: [errorEmbed(guild, '❌', t(l, 'tv_must_voice'))] });
      }

      if (!createChannel) {
        try {
          createChannel = await guild.channels.create({
            name: t(l, 'tv_auto_channel_name'),
            type: ChannelType.GuildVoice,
            parent: category.id,
          });
        } catch (e) {
          return interaction.reply({ embeds: [errorEmbed(guild, '❌', t(l, 'tv_create_failed'))] });
        }
      }

      const cfg = {
        enabled: true,
        createChannel: createChannel.id,
        category: category.id,
        userLimit: Math.max(0, interaction.options.getInteger('limit') || 0),
      };
      setConfig(guild.id, cfg);

      return interaction.reply({ embeds: [successEmbed(guild, t(l, 'tv_enabled_title'), t(l, 'tv_enabled_desc', createChannel, category, cfg.userLimit || t(l, 'tv_unlimited')))] });
    }

    const cfg = getConfig(guild.id);
    if (sub === 'disable') {
      cfg.enabled = false;
      setConfig(guild.id, cfg);
      return interaction.reply({ embeds: [successEmbed(guild, t(l, 'tv_disabled_title'), t(l, 'tv_disabled_desc'))] });
    }

    if (sub === 'status') {
      const cat = cfg.category ? guild.channels.cache.get(cfg.category) : null;
      return interaction.reply({
        embeds: [embed(guild, {
          title: t(l, 'tv_status_title'),
          fields: [
            { name: t(l, 'tv_status'), value: cfg.enabled ? `✅ ${t(l, 'tv_enabled')}` : `❌ ${t(l, 'tv_disabled')}`, inline: true },
            { name: t(l, 'tv_create_channel'), value: cfg.createChannel ? `<#${cfg.createChannel}>` : '—', inline: true },
            { name: t(l, 'tv_cat'), value: cat ? `\`${cat.name}\`` : '—', inline: true },
            { name: t(l, 'tv_user_limit'), value: cfg.userLimit ? String(cfg.userLimit) : t(l, 'tv_unlimited'), inline: true },
          ],
          color: 'info',
        })],
      });
    }
  },
};
