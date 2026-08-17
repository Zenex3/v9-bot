const { SlashCommandBuilder } = require('discord.js');
const { embed } = require('../../utils/embed');
const { L } = require('../../utils/i18n');

module.exports = {
  category: 'info',
  descEn: 'Diagnose role hierarchy and kick possibility',
  data: new SlashCommandBuilder()
    .setName('hierarchy')
    .setDescription('تشخيص ترتيب الرولات وهل انت والبوت تقدر تطرد')
    .setDescriptionLocalizations({ 'en-US': 'Diagnose role hierarchy and kick possibility' })
    .addUserOption((o) => o.setName('user').setDescription(L('x', 'العضو', 'Member')).setDescriptionLocalizations({ 'en-US': 'Member' }).setRequired(true)),
  cooldown: 3000,
  async run(client, interaction) {
    const l = interaction.user.id;
    const target = interaction.options.getUser('user');
    const member = await interaction.guild.members.fetch(target.id).catch(() => null);
    if (!member) return interaction.reply({ embeds: [embed(interaction.guild, { title: '❌', description: L(l, 'العضو غير موجود في السيرفر', 'Member not in this server'), color: 'error' })], ephemeral: true });

    const me = interaction.member;
    const botMember = interaction.guild.members.me;
    const myRole = me.roles.highest;
    const botRole = botMember.roles.highest;
    const targetRole = member.roles.highest;

    const verdict = (isOwner) => {
      if (isOwner) return L(l, '✅ **مالك السيرفر** — بيكسر الهرمية ويقدر يطرد', '✅ **Server owner** — bypasses hierarchy, can kick');
      if (botRole.position > targetRole.position) return L(l, '✅ رول البوت **فوق** رول المستهدف — يطرد', '✅ Bot role is **above** target role — can kick');
      if (botRole.position === targetRole.position) return L(l, `❌ رول البوت **يساوي** رول المستهدف (الترتيب ${botRole.position}) — ممنوع`, `❌ Bot role **equals** target role (${botRole.position}) — blocked`);
      return L(l, `❌ رول البوت **تحت** رول المستهدف (${botRole.position} < ${targetRole.position}) — ممنوع`, `❌ Bot role is **below** target role (${botRole.position} < ${targetRole.position}) — blocked`);
    };

    const botIsOwner = interaction.guild.ownerId === botMember.id;

    const hierEmbed = embed(interaction.guild, {
      title: L(l, '📐 تشخيص ترتيب الرولات', '📐 Role Hierarchy Diagnosis'),
      description: L(l, 'الرقم الأكبر = أعلى في القائمة\n**المهم:** أمر `/kick` بيشتغل باسم البوت، فلازم رول **البوت** فوق رول المستهدف', 'Higher number = higher in the list\n**Note:** `/kick` runs as the bot, so the **bot** role must be above the target role'),
      fields: [
        { name: L(l, '🎯 المستهدف', '🎯 Target'), value: `**${targetRole}** (${targetRole.position})`, inline: false },
        { name: `🤖 ${L(l, 'البوت', 'The bot')} (${botMember.user.tag})`, value: `${L(l, 'أعلى رول', 'Highest role')}: **${botRole}** (${botRole.position})\n${L(l, 'النتيجة', 'Result')}: ${verdict(botIsOwner)}`, inline: false },
        { name: `👤 ${L(l, 'أنت', 'You')} (${interaction.user.tag})`, value: `${L(l, 'أعلى رول', 'Highest role')}: **${myRole}** (${myRole.position})`, inline: false },
      ],
    });
    await interaction.reply({ embeds: [hierEmbed] });
  },
};
