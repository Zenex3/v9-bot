const { SlashCommandBuilder } = require('discord.js');
const { successEmbed } = require('../../utils/embed');
const { L } = require('../../utils/i18n');
const { db } = require('../../utils/database');

module.exports = {
  category: 'owner',
  descEn: 'Toggle maintenance mode (developer only)',
  data: new SlashCommandBuilder()
    .setName('maintenance')
    .setDescription('وضع الصيانة — يمنع جميع الاوامر (مطور فقط)')
    .setDescriptionLocalizations({ 'en-US': 'Maintenance mode — blocks all commands (developer only)' })
    .addBooleanOption((o) => o.setName('enabled').setDescription(L('x', 'مفعل؟', 'Enabled?')).setDescriptionLocalizations({ 'en-US': 'Enabled?' }).setRequired(true))
    .setDefaultMemberPermissions(8),
  devOnly: true,
  async run(client, interaction) {
    const l = interaction.user.id;
    const enabled = interaction.options.getBoolean('enabled');
    db.bot.set('maintenance', { enabled, at: Date.now() });

    await interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '🛠️ Maintenance', '🛠️ Maintenance'), L(l, enabled ? 'تم تفعيل وضع الصيانة — جميع الاوامر معطلة للجميع' : 'تم ايقاف وضع الصيانة', enabled ? 'Maintenance mode enabled — all commands disabled' : 'Maintenance mode disabled'))] });
  },
};
