const { SlashCommandBuilder, PermissionFlagsBits, StringSelectMenuBuilder, ChannelType } = require('discord.js');
const { embed, successEmbed, errorEmbed, row } = require('../../utils/embed');
const { db } = require('../../utils/database');
const { L } = require('../../utils/i18n');

async function handleReactionRoleSelect(client, interaction) {
  if (!interaction.isStringSelectMenu() || interaction.customId !== 'rr_select') return;
  const l = interaction.user.id;
  const values = interaction.values;
  const list = db.guilds.ensure(interaction.guild.id, 'reactionRoles', []);
  const member = interaction.member;

  let added = 0;
  let removed = 0;
  for (const v of values) {
    const roleId = v.replace('rr_', '');
    if (!list.some((r) => r.id === roleId)) continue;
    const role = interaction.guild.roles.cache.get(roleId);
    if (!role) continue;
    if (member.roles.cache.has(roleId)) {
      await member.roles.remove(role).catch(() => null);
      removed++;
    } else {
      await member.roles.add(role).catch(() => null);
      added++;
    }
  }
  await interaction.reply({
    embeds: [embed(interaction.guild, {
      title: L(l, '🎭 تم', '🎭 Done'),
      description: L(l,
        `اضيف: ${added} رول\nازيل: ${removed} رول`,
        `Added: ${added} role(s)\nRemoved: ${removed} role(s)`),
      color: 'success',
    })],
    ephemeral: true,
  });
}

module.exports = {
  components: { 'rr_select': handleReactionRoleSelect },
  category: 'config',
  descEn: 'Set up reaction roles',
  data: new SlashCommandBuilder()
    .setName('reactionrole')
    .setDescription('اعداد نظام الرياكشن رولز')
    .setDescriptionLocalizations({ 'en-US': 'Set up reaction roles' })
    .setDefaultMemberPermissions(8)
    .addSubcommand((s) => s.setName('add').setDescription(L('x', 'اضافة رول للوحة', 'Add a role to the panel')).setDescriptionLocalizations({ 'en-US': 'Add a role to the panel' }).addRoleOption((o) => o.setName('role').setDescription(L('x', 'الرول', 'Role')).setDescriptionLocalizations({ 'en-US': 'Role' }).setRequired(true)).addStringOption((o) => o.setName('label').setDescription(L('x', 'التسمية', 'Label')).setDescriptionLocalizations({ 'en-US': 'Label' }).setRequired(true)))
    .addSubcommand((s) => s.setName('remove').setDescription(L('x', 'حذف رول من اللوحة', 'Remove a role from the panel')).setDescriptionLocalizations({ 'en-US': 'Remove a role from the panel' }).addRoleOption((o) => o.setName('role').setDescription(L('x', 'الرول', 'Role')).setDescriptionLocalizations({ 'en-US': 'Role' }).setRequired(true)))
    .addSubcommand((s) => s.setName('panel').setDescription(L('x', 'انشاء اللوحة', 'Create the panel')).setDescriptionLocalizations({ 'en-US': 'Create the panel' }).addChannelOption((o) => o.setName('channel').setDescription(L('x', 'القناة', 'Channel')).setDescriptionLocalizations({ 'en-US': 'Channel' }).addChannelTypes(ChannelType.GuildText).setRequired(true)).addStringOption((o) => o.setName('title').setDescription(L('x', 'عنوان اللوحة', 'Panel title')).setDescriptionLocalizations({ 'en-US': 'Panel title' }))),
  async run(client, interaction) {
    const l = interaction.user.id;
    const sub = interaction.options.getSubcommand();
    const list = db.guilds.ensure(interaction.guild.id, 'reactionRoles', []);

    if (sub === 'add') {
      const role = interaction.options.getRole('role');
      const label = interaction.options.getString('label');
      if (role.position >= interaction.member.roles.highest.position) {
        return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'لا يمكنك ادارة هذا الرول', 'You cannot manage this role'))], ephemeral: true });
      }
      if (role.managed) return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'لا يمكن اضافة رول تابع للتطبيقات', 'Cannot add integration-managed roles'))], ephemeral: true });
      if (!list.some((r) => r.id === role.id)) list.push({ id: role.id, label });
      else list[list.findIndex((r) => r.id === role.id)].label = label;
      db.guilds.set(interaction.guild.id, 'reactionRoles', list);
      return interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '✅ تم', '✅ Done'), L(l, `تمت اضافة ${role} للوحة`, `Added ${role} to the panel`))] });
    }

    if (sub === 'remove') {
      const role = interaction.options.getRole('role');
      const idx = list.findIndex((r) => r.id === role.id);
      if (idx === -1) return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'هذا الرول ليس في اللوحة', 'This role is not on the panel'))], ephemeral: true });
      list.splice(idx, 1);
      db.guilds.set(interaction.guild.id, 'reactionRoles', list);
      return interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '✅ تم', '✅ Done'), L(l, `تمت ازالة ${role} من اللوحة`, `Removed ${role} from the panel`))] });
    }

    if (sub === 'panel') {
      const channel = interaction.options.getChannel('channel');
      const title = interaction.options.getString('title') || L(l, '🎭 اختر رولاتك', '🎭 Choose your roles');
      if (!list.length) return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'لا توجد رولات، اضف اولا بـ /reactionrole add', 'No roles yet, use /reactionrole add first'))], ephemeral: true });

      const select = new StringSelectMenuBuilder()
        .setCustomId(`rr_select`)
        .setPlaceholder(L(l, 'اختر رول...', 'Choose a role...'))
        .setMinValues(1)
        .setMaxValues(Math.min(list.length, 25))
        .addOptions(list.slice(0, 25).map((r, i) => ({
          label: r.label.slice(0, 100),
          value: `rr_${r.id}`,
          emoji: { name: String.fromCharCode(9312 + i) },
        })));

      const panelEmbed = embed(interaction.guild, {
        title,
        description: list.map((r) => `<@&${r.id}>`).join('\n'),
      });
      await channel.send({ embeds: [panelEmbed], components: [row(select)] });
      return interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '✅ تم', '✅ Done'), L(l, `تم انشاء اللوحة في ${channel}`, `Panel created in ${channel}`))] });
    }
  },
};
