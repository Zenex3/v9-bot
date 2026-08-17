const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { embed, successEmbed, errorEmbed } = require('../../utils/embed');
const { hasHigherRole } = require('../../utils/functions');
const { db, memberKey, getMember } = require('../../utils/database');
const { sendModLog, sendLog, getProtection } = require('../../services/logService');
const { L } = require('../../utils/i18n');

async function checkMaxWarns(guild, target, warns) {
  const protection = getProtection(guild.id);
  const maxWarns = protection.maxWarns;
  if (!maxWarns?.enabled || warns.length < maxWarns.count) return;
  const member = await guild.members.fetch(target.id).catch(() => null);
  if (!member) return;
  const pNames = { mute: { ar: 'اخمات', en: 'Timeout' }, kick: { ar: 'كيك', en: 'Kick' }, ban: { ar: 'بان', en: 'Ban' } };
  const p = pNames[maxWarns.punishment] || { ar: maxWarns.punishment, en: maxWarns.punishment };
  try {
    if (maxWarns.punishment === 'mute') await member.timeout(10 * 60 * 1000, 'Max warns reached');
    else if (maxWarns.punishment === 'kick') await member.kick('Max warns reached');
    else if (maxWarns.punishment === 'ban') await member.ban({ reason: 'Max warns reached' });
    await sendLog(guild, 'protection', embed(guild, { title: '⚠️ Max Warns', description: `**${target.tag}** وصل ${warns.length} تحذيرات — تم تطبيق: ${p.ar}`, color: 'warning' }));
  } catch {}
  return p;
}

module.exports = {
  category: 'moderation',
  descEn: 'Warn a member',
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('تحذير عضو')
    .setDescriptionLocalizations({ 'en-US': 'Warn a member' })
    .setDefaultMemberPermissions(8)
    .addUserOption((o) => o.setName('user').setDescription(L('x', 'العضو', 'Member')).setDescriptionLocalizations({ 'en-US': 'Member' }).setRequired(true))
    .addStringOption((o) => o.setName('reason').setDescription(L('x', 'سبب التحذير', 'Warn reason')).setDescriptionLocalizations({ 'en-US': 'Warn reason' }).setRequired(true)),
  async run(client, interaction) {
    const l = interaction.user.id;
    const target = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason');
    const member = await interaction.guild.members.fetch(target.id).catch(() => null);

    if (member && member.id === interaction.user.id) {
      return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'لا يمكنك تحذير هذا العضو', 'You cannot warn this member'))], ephemeral: true });
    }

    const data = getMember(interaction.guild.id, target.id);
    const warns = Array.isArray(data.warns) ? data.warns : [];
    warns.push({ reason, mod: interaction.user.tag, modId: interaction.user.id, date: Date.now() });
    data.warns = warns;
    db.members.set(memberKey(interaction.guild.id, target.id), data);

    await interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '⚠️ تم التحذير', '⚠️ Warned'), L(l, `**${target.tag}** حصل على تحذير (${warns.length})\n**السبب:** ${reason}`, `**${target.tag}** received a warning (${warns.length})\n**Reason:** ${reason}`))] });

    if (member) {
      member.send({
        embeds: [embed(interaction.guild, {
          title: L(l, '⚠️ تحذير', '⚠️ Warning'),
          description: L(l, `لقد استلمت تحذير في **${interaction.guild.name}**\n**السبب:** ${reason}\n**بواسطة:** ${interaction.user.tag}`, `You received a warning in **${interaction.guild.name}**\n**Reason:** ${reason}\n**By:** ${interaction.user.tag}`),
          color: 'warning',
        })],
      }).catch(() => null);
    }

    await sendModLog(interaction.guild, embed(interaction.guild, { title: L(l, '⚠️ تحذير', '⚠️ Warning'), description: L(l, `**العضو:** ${target.tag}\n**بواسطة:** ${interaction.user.tag}\n**السبب:** ${reason}`, `**Member:** ${target.tag}\n**By:** ${interaction.user.tag}\n**Reason:** ${reason}`), color: 'warning' }));
    await checkMaxWarns(interaction.guild, target, warns);
  },
};
