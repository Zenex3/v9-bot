const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { embed, successEmbed, errorEmbed } = require('../../utils/embed');
const { sendModLog } = require('../../services/logService');
const { L } = require('../../utils/i18n');

module.exports = {
  category: 'moderation',
  descEn: 'Clone a channel',
  data: new SlashCommandBuilder()
    .setName('copy')
    .setDescription('نسخ قناة بالكامل')
    .setDescriptionLocalizations({ 'en-US': 'Clone a channel' })
    .setDefaultMemberPermissions(8)
    .addChannelOption((o) => o.setName('channel').setDescription(L('x', 'القناة المراد نسخها', 'Channel to clone')).setDescriptionLocalizations({ 'en-US': 'Channel to clone' }).setRequired(true))
    .addStringOption((o) => o.setName('name').setDescription(L('x', 'الاسم الجديد (اختياري)', 'New name (optional)')).setDescriptionLocalizations({ 'en-US': 'New name (optional)' })),
  async run(client, interaction) {
    const l = interaction.user.id;
    const channel = interaction.options.getChannel('channel');
    const name = interaction.options.getString('name');

    if (channel.isThread()) {
      return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'لا يمكن نسخ الثريدات', 'Threads cannot be cloned'))], ephemeral: true });
    }

    try {
      const clone = await channel.clone({ name: name || undefined, reason: `Clone by ${interaction.user.tag}` });
      await interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '📑 تم النسخ', '📑 Cloned'), L(l, `تم نسخ ${channel} → ${clone}`, `Cloned ${channel} → ${clone}`))] });
      await sendModLog(interaction.guild, embed(interaction.guild, { title: L(l, '📑 نسخ قناة', '📑 Clone Channel'), description: L(l, `**القناة:** ${channel.name}\n**بواسطة:** ${interaction.user.tag}`, `**Channel:** ${channel.name}\n**By:** ${interaction.user.tag}`) }));
    } catch (e) {
      await interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'فشل نسخ القناة', 'Failed to clone channel'))], ephemeral: true });
    }
  },
};
