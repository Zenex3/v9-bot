const { SlashCommandBuilder, ActivityType } = require('discord.js');
const { successEmbed } = require('../../utils/embed');
const { L } = require('../../utils/i18n');
const { db } = require('../../utils/database');

module.exports = {
  category: 'owner',
  descEn: 'Set bot status (developer only)',
  data: new SlashCommandBuilder()
    .setName('status')
    .setDescription('تغيير حالة البوت (مطور فقط)')
    .setDescriptionLocalizations({ 'en-US': 'Set bot status (developer only)' })
    .addStringOption((o) => o.setName('text').setDescription(L('x', 'النص', 'Text')).setDescriptionLocalizations({ 'en-US': 'Text' }).setRequired(true))
    .setDefaultMemberPermissions(8),
  devOnly: true,
  async run(client, interaction) {
    const l = interaction.user.id;
    const text = interaction.options.getString('text');
    const activity = { name: text, type: ActivityType.Playing };
    client.customActivity = activity;
    db.bot.set('activity', { activity, status: 'online' });
    db.bot.flush();
    await client.user.setPresence({ activities: [activity], status: 'online' });
    await interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '✅ تم', '✅ Done'), L(l, `تم تغيير الحالة الى **${text}** — ستُحفظ حتى بعد اعادة التشغيل`, `Status changed to **${text}** — it will be saved even after restart`))] });
  },
};
