const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embed');
const { getProtection } = require('../../services/logService');
const { db } = require('../../utils/database');
const { L } = require('../../utils/i18n');

module.exports = {
  category: 'protection',
  descEn: 'Auto-kick bots joining the server',
  data: new SlashCommandBuilder()
    .setName('antibot')
    .setDescription('طرد البوتات تلقائيا')
    .setDescriptionLocalizations({ 'en-US': 'Auto-kick bots' })
    .setDefaultMemberPermissions(8)
    .addStringOption((o) => o.setName('state').setDescription(L('x', 'تشغيل/ايقاف', 'Enable/disable')).setDescriptionLocalizations({ 'en-US': 'Enable/disable' }).setRequired(true).addChoices({ name: L('x', 'تشغيل', 'Enable'), value: 'on' }, { name: L('x', 'ايقاف', 'Disable'), value: 'off' }))
    .addUserOption((o) => o.setName('whitelist').setDescription(L('x', 'استثناء بوت (اختياري)', 'Whitelist a bot (optional)')).setDescriptionLocalizations({ 'en-US': 'Whitelist a bot (optional)' })),
  async run(client, interaction) {
    const l = interaction.user.id;
    const state = interaction.options.getString('state');
    const whitelist = interaction.options.getUser('whitelist');
    const protection = getProtection(interaction.guild.id);
    if (!protection.antiBot) protection.antiBot = { enabled: false, whitelist: [] };

    protection.antiBot.enabled = state === 'on';
    if (whitelist) {
      if (whitelist.bot && !protection.antiBot.whitelist.includes(whitelist.id)) protection.antiBot.whitelist.push(whitelist.id);
      else return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'العضو المحدد ليس بوتا', 'The selected user is not a bot'))], ephemeral: true });
    }
    db.guilds.set(interaction.guild.id, 'protection', protection);

    await interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '🤖 Anti-Bot', '🤖 Anti-Bot'), L(l, `**الحالة:** ${state === 'on' ? 'مفعل' : 'معطل'}${protection.antiBot.whitelist.length ? `\n**الاستثناءات:** ${protection.antiBot.whitelist.map((id) => `<@${id}>`).join(', ')}` : ''}`, `**Status:** ${state === 'on' ? 'Enabled' : 'Disabled'}${protection.antiBot.whitelist.length ? `\n**Whitelisted:** ${protection.antiBot.whitelist.map((id) => `<@${id}>`).join(', ')}` : ''}`))] });
  },
};
