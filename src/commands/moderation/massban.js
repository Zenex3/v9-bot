const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { embed, successEmbed, errorEmbed } = require('../../utils/embed');
const { hasHigherRole } = require('../../utils/functions');
const { sendModLog } = require('../../services/logService');
const { L } = require('../../utils/i18n');

module.exports = {
  category: 'moderation',
  descEn: 'Ban multiple members at once',
  data: new SlashCommandBuilder()
    .setName('massban')
    .setDescription('حظر عدة اعضاء دفعة واحدة')
    .setDescriptionLocalizations({ 'en-US': 'Ban multiple members' })
    .setDefaultMemberPermissions(8)
    .addStringOption((o) => o.setName('users').setDescription(L('x', 'معرفات الاعضاء مفصولة بمسافات (IDs)', 'Member IDs separated by spaces')).setDescriptionLocalizations({ 'en-US': 'Member IDs separated by spaces' }).setRequired(true))
    .addStringOption((o) => o.setName('reason').setDescription(L('x', 'السبب', 'Reason')).setDescriptionLocalizations({ 'en-US': 'Reason' })),
  async run(client, interaction) {
    const l = interaction.user.id;
    const ids = interaction.options.getString('users').split(/[\s,]+/).filter(Boolean).slice(0, 20);
    const reason = interaction.options.getString('reason') || L(l, 'بدون سبب', 'No reason');

    if (!ids.length) return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'لا توجد معرفات صالحة', 'No valid IDs'))], ephemeral: true });

    await interaction.reply({ embeds: [embed(interaction.guild, { title: '⏳', description: L(l, `جاري حظر **${ids.length}** عضو...`, `Banning **${ids.length}** members...`), color: 'info' })] });

    let banned = 0;
    const failed = [];
    for (const id of ids) {
      const member = await interaction.guild.members.fetch(id).catch(() => null);
      if (member && (member.id === interaction.user.id || !hasHigherRole(interaction.member, member))) { failed.push(id); continue; }
      try {
        await interaction.guild.bans.create(id, { reason: `Massban | ${interaction.user.tag} | ${reason}` });
        banned++;
      } catch { failed.push(id); }
    }

    await interaction.editReply({ embeds: [successEmbed(interaction.guild, L(l, '🔨 Massban', '🔨 Massban'), L(l, `تم حظر **${banned}** عضو${failed.length ? `\nفشل: \`${failed.join('`, `')}\`` : ''}`, `Banned **${banned}** members${failed.length ? `\nFailed: \`${failed.join('`, `')}\`` : ''}`))] });
    await sendModLog(interaction.guild, embed(interaction.guild, { title: L(l, '🔨 Massban', '🔨 Massban'), description: L(l, `**العدد:** ${banned}\n**بواسطة:** ${interaction.user.tag}\n**السبب:** ${reason}`, `**Count:** ${banned}\n**By:** ${interaction.user.tag}\n**Reason:** ${reason}`) }));
  },
};
