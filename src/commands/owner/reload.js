const { SlashCommandBuilder } = require('discord.js');
const { embed, successEmbed, errorEmbed } = require('../../utils/embed');
const { reloadCommands } = require('../../handlers/commandHandler');
const { loadComponents } = require('../../handlers/componentHandler');
const commandSync = require('../../services/commandSync');
const { t } = require('../../utils/i18n');

module.exports = {
  category: 'owner',
  descEn: 'Reload commands (developer only)',
  data: new SlashCommandBuilder()
    .setName('reload')
    .setDescription('اعادة تحميل الاوامر (مطور فقط)')
    .setDescriptionLocalizations({ 'en-US': 'Reload commands (developer only)' })
    .setDefaultMemberPermissions(8),
  devOnly: true,
  async run(client, interaction) {
    const l = interaction.user.id;
    try {
      const cmds = reloadCommands();
      for (const cmd of cmds) client.commands.set(cmd.data.name, cmd);
      loadComponents();
      let syncLine = '';
      try {
        const results = await commandSync.sync();
        syncLine = `\n🔄 ${t(l, 'reload_synced')} ${results.join(' | ')}`;
      } catch (se) {
        syncLine = `\n⚠️ ${t(l, 'reload_sync_failed')} ${se.message}`;
      }
      await interaction.reply({ embeds: [successEmbed(interaction.guild, t(l, 'reload_title'), t(l, 'reload_desc', cmds.length) + syncLine)] });
    } catch (e) {
      await interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', e.message)] });
    }
  },
};
