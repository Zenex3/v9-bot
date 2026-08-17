const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed } = require('../../utils/embed');
const { getProtection } = require('../../services/logService');
const { db } = require('../../utils/database');
const { L } = require('../../utils/i18n');

module.exports = {
  category: 'protection',
  descEn: 'Toggle ghost ping detection',
  data: new SlashCommandBuilder()
    .setName('ghostping')
    .setDescription('كشف القوست بنق')
    .setDescriptionLocalizations({ 'en-US': 'Toggle ghost ping detection' })
    .setDefaultMemberPermissions(8)
    .addStringOption((o) => o.setName('state').setDescription(L('x', 'تشغيل/ايقاف', 'Enable/disable')).setDescriptionLocalizations({ 'en-US': 'Enable/disable' }).setRequired(true).addChoices({ name: L('x', '✅ تشغيل', '✅ Enable'), value: 'on' }, { name: L('x', '❌ ايقاف', '❌ Disable'), value: 'off' })),
  async run(client, interaction) {
    const l = interaction.user.id;
    const state = interaction.options.getString('state');
    const protection = getProtection(interaction.guild.id);
    protection.ghostPing.enabled = state === 'on';
    db.guilds.set(interaction.guild.id, 'protection', protection);
    await interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '👻 كشف القوست بنق', '👻 Ghost Ping Detection'), state === 'on' ? L(l, 'تم التفعيل ✅', 'Enabled ✅') : L(l, 'تم الايقاف ❌', 'Disabled ❌'))] });
  },
};
