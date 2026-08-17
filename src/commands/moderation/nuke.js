const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { embed, successEmbed, errorEmbed } = require('../../utils/embed');
const { L } = require('../../utils/i18n');

module.exports = {
  category: 'moderation',
  descEn: 'Clone and delete a channel',
  data: new SlashCommandBuilder()
    .setName('nuke')
    .setDescription('تفجير القناة واعادة انشاءها')
    .setDescriptionLocalizations({ 'en-US': 'Clone and delete a channel' })
    .setDefaultMemberPermissions(8),
  botPermissions: [PermissionFlagsBits.ManageChannels],
  async run(client, interaction) {
    const l = interaction.user.id;
    const channel = interaction.channel;
    const name = channel.name;
    const topic = channel.topic;
    const parent = channel.parent;
    const nsfw = channel.nsfw;

    try {
      await interaction.deferReply({ ephemeral: true });
      const newChannel = await channel.clone({ name, topic, parent: parent?.id, nsfw });
      await channel.delete();
      newChannel.send({ embeds: [embed(interaction.guild, { title: L(l, '💥 تم تفجير القناة!', '💥 Channel nuked!'), description: L(l, `اعادة انشاء بواسطة ${interaction.user}`, `Recreated by ${interaction.user}`) })] }).catch(() => {});
      await interaction.editReply({ embeds: [successEmbed(interaction.guild, L(l, '💥 تفجير ناجح', '💥 Nuked'), L(l, `تم تفجير القناة واعادة انشائها: ${newChannel}`, `Channel recreated: ${newChannel}`))] });
    } catch {
      return interaction.editReply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'فشل تفجير القناة', 'Failed to nuke channel'))] }).catch(() => {});
    }
  },
};
