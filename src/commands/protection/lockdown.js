const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { embed, successEmbed } = require('../../utils/embed');
const { L } = require('../../utils/i18n');

module.exports = {
  category: 'protection',
  descEn: 'Server-wide lockdown',
  data: new SlashCommandBuilder()
    .setName('lockdown')
    .setDescription('قفل جميع القنوات')
    .setDescriptionLocalizations({ 'en-US': 'Server-wide lockdown' })
    .setDefaultMemberPermissions(8)
    .addStringOption((o) => o.setName('state').setDescription(L('x', 'تشغيل/ايقاف', 'Enable/disable')).setDescriptionLocalizations({ 'en-US': 'Enable/disable' }).setRequired(true).addChoices({ name: L('x', 'قفل', 'Lockdown'), value: 'on' }, { name: L('x', 'فتح', 'Unlock'), value: 'off' })),
  async run(client, interaction) {
    const l = interaction.user.id;
    const state = interaction.options.getString('state');
    const everyone = interaction.guild.roles.everyone;

    const textChannels = interaction.guild.channels.cache.filter((c) => c.isTextBased() && !c.isThread());

    if (state === 'on') {
      let count = 0;
      for (const c of textChannels.values()) {
        const perms = c.permissionOverwrites.cache.get(everyone.id);
        if (perms && perms.deny.has('SendMessages')) continue;
        await c.permissionOverwrites.edit(everyone, { SendMessages: false }, { reason: 'Lockdown' }).catch(() => null);
        count++;
      }
      await interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '🔒 Lockdown', '🔒 Lockdown'), L(l, `تم قفل **${count}** قناة`, `Locked **${count}** channels`))] });
    } else {
      let count = 0;
      for (const c of textChannels.values()) {
        const perms = c.permissionOverwrites.cache.get(everyone.id);
        if (perms && perms.deny.has('SendMessages')) {
          await c.permissionOverwrites.edit(everyone, { SendMessages: null }, { reason: 'End lockdown' }).catch(() => null);
          count++;
        }
      }
      await interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '🔓 Unlocked', '🔓 Unlocked'), L(l, `تم فتح **${count}** قناة`, `Unlocked **${count}** channels`))] });
    }
  },
};
