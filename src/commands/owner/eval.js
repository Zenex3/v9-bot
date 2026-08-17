const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { embed, errorEmbed } = require('../../utils/embed');
const { isOwner } = require('../../utils/functions');

function clean(text) {
  return String(text).replace(/`/g, '`').replace(/@everyone/g, '@everyone').replace(/@here/g, '@here');
}

module.exports = {
  category: 'owner',
  descEn: 'Execute code (developer only)',
  data: new SlashCommandBuilder()
    .setName('eval')
    .setDescription('تنفيذ كود (مطور فقط)')
    .setDescriptionLocalizations({ 'en-US': 'Execute code (developer only)' })
    .addStringOption((o) => o.setName('code').setDescription('الكود').setRequired(true))
    .setDefaultMemberPermissions(8),
  devOnly: true,
  async run(client, interaction) {
    const code = interaction.options.getString('code');
    await interaction.deferReply({ ephemeral: true });
    try {
      const result = await eval(`(async () => {\n${code}\n})()`);
      const res = typeof result === 'string' ? result : require('util').inspect(result, { depth: 0 });
      await interaction.editReply({ embeds: [embed(interaction.guild, { title: '✅ النتيجة', description: `\`\`\`js\n${clean(res).slice(0, 3800)}\n\`\`\``, color: 'success' })] });
    } catch (e) {
      await interaction.editReply({ embeds: [errorEmbed(interaction.guild, '❌ خطا', `\`\`\`js\n${clean(e.stack || e.message).slice(0, 3800)}\n\`\`\``)] });
    }
  },
};
