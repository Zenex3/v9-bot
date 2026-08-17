const { SlashCommandBuilder, PermissionFlagsBits, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');
const { embed, successEmbed, errorEmbed, row } = require('../../utils/embed');
const { getProtection } = require('../../services/logService');
const { db } = require('../../utils/database');
const { L } = require('../../utils/i18n');

async function handleVerifyClick(client, interaction) {
  const l = interaction.user.id;
  const protection = getProtection(interaction.guild.id);
  if (!protection.verification?.enabled || !protection.verification.role) {
    return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'نظام التوثيق غير مفعل', 'Verification is disabled'))], ephemeral: true });
  }
  const role = interaction.guild.roles.cache.get(protection.verification.role);
  if (!role) return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'رول التوثيق غير موجود', 'Verification role not found'))], ephemeral: true });

  await interaction.member.roles.add(role).catch(() => null);
  await interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '✅ تم توثيقك', '✅ Verified'), L(l, `مبروك! تم منحك رول ${role}`, `Congrats! You received the ${role} role`))], ephemeral: true });
}

module.exports = {
  components: { 'verify_click': handleVerifyClick },
  category: 'protection',
  descEn: 'Member verification gate system',
  data: new SlashCommandBuilder()
    .setName('verification')
    .setDescription('نظام توثيق الاعضاء الجدد')
    .setDescriptionLocalizations({ 'en-US': 'Member verification system' })
    .setDefaultMemberPermissions(8)
    .addSubcommand((s) => s.setName('on').setDescription(L('x', 'تفعيل التوثيق', 'Enable verification')).setDescriptionLocalizations({ 'en-US': 'Enable verification' }).addRoleOption((o) => o.setName('role').setDescription(L('x', 'رول التوثيق', 'Verified role')).setDescriptionLocalizations({ 'en-US': 'Verified role' }).setRequired(true)))
    .addSubcommand((s) => s.setName('off').setDescription(L('x', 'ايقاف التوثيق', 'Disable verification')).setDescriptionLocalizations({ 'en-US': 'Disable verification' }))
    .addSubcommand((s) => s.setName('panel').setDescription(L('x', 'انشاء لوحة التوثيق', 'Create verification panel')).setDescriptionLocalizations({ 'en-US': 'Create verification panel' }).addChannelOption((o) => o.setName('channel').setDescription(L('x', 'القناة', 'Channel')).setDescriptionLocalizations({ 'en-US': 'Channel' }).addChannelTypes(ChannelType.GuildText).setRequired(true))),
  async run(client, interaction) {
    const l = interaction.user.id;
    const sub = interaction.options.getSubcommand();
    const protection = getProtection(interaction.guild.id);
    if (!protection.verification) protection.verification = { enabled: false, role: null };

    if (sub === 'on') {
      const role = interaction.options.getRole('role');
      protection.verification.enabled = true;
      protection.verification.role = role.id;
      db.guilds.set(interaction.guild.id, 'protection', protection);
      return interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '✅ تم', '✅ Done'), L(l, `تم تفعيل التوثيق — رول التوثيق: ${role}`, `Verification enabled — role: ${role}`))] });
    }

    if (sub === 'off') {
      protection.verification.enabled = false;
      db.guilds.set(interaction.guild.id, 'protection', protection);
      return interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '✅ تم', '✅ Done'), L(l, 'تم ايقاف التوثيق', 'Verification disabled'))] });
    }

    if (sub === 'panel') {
      if (!protection.verification.enabled || !protection.verification.role) {
        return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'فعّل التوثيق اولا بـ /verification on', 'Enable verification first with /verification on'))], ephemeral: true });
      }
      const channel = interaction.options.getChannel('channel');
      const panel = embed(interaction.guild, {
        title: L(l, '✅ نظام التوثيق', '✅ Verification System'),
        description: L(l, 'اضغط على الزر بالاسفل لتوثيق حسابك', 'Click the button below to verify yourself'),
      });
      const btn = new ButtonBuilder().setCustomId('verify_click').setLabel(L(l, '✅ توثيق', '✅ Verify')).setStyle(ButtonStyle.Success);
      await channel.send({ embeds: [panel], components: [row(btn)] });
      return interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '✅ تم', '✅ Done'), L(l, `تم انشاء لوحة التوثيق في ${channel}`, `Verification panel created in ${channel}`))] });
    }
  },
};
