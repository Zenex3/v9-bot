const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embed');
const { db } = require('../../utils/database');
const { L } = require('../../utils/i18n');

module.exports = {
  category: 'owner',
  descEn: 'Blacklist a user or server (developer only)',
  data: new SlashCommandBuilder()
    .setName('blacklist')
    .setDescription('حظر مستخدم او سيرفر (مطور فقط)')
    .setDescriptionLocalizations({ 'en-US': 'Blacklist a user or server (developer only)' })
    .addStringOption((o) => o.setName('type').setDescription(L('x', 'النوع', 'Type')).setDescriptionLocalizations({ 'en-US': 'Type' }).setRequired(true).addChoices({ name: '👤 ' + L('x', 'مستخدم', 'User'), value: 'user' }, { name: '🌐 ' + L('x', 'سيرفر', 'Server'), value: 'guild' }))
    .addStringOption((o) => o.setName('id').setDescription(L('x', 'الايدي', 'ID')).setDescriptionLocalizations({ 'en-US': 'ID' }).setRequired(true))
    .addStringOption((o) => o.setName('reason').setDescription(L('x', 'السبب', 'Reason')).setDescriptionLocalizations({ 'en-US': 'Reason' }))
    .setDefaultMemberPermissions(8),
  devOnly: true,
  async run(client, interaction) {
    const l = interaction.user.id;
    const type = interaction.options.getString('type');
    const id = interaction.options.getString('id');
    const reason = interaction.options.getString('reason') || L(l, 'بدون سبب', 'No reason');

    const bl = db.bot.ensure('blacklist', { user: [], guild: [] });
    const list = bl[type];
    if (list.some((b) => b.id === id)) return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'موجود بالفعل في القائمة السوداء', 'Already in the blacklist'))], ephemeral: true });
    list.push({ id, reason, date: Date.now() });
    db.bot.set('blacklist', bl);

    if (type === 'guild') {
      const guild = client.guilds.cache.get(id);
      if (guild) {
        const ownerId = guild.ownerId;
        if (ownerId) {
          const user = await client.users.fetch(ownerId).catch(() => null);
          if (user) await user.send(L(l, `تم حظر سيرفرك **${guild.name}** من استخدام البوت.\n**السبب:** ${reason}`, `Your server **${guild.name}** has been blacklisted from the bot.\n**Reason:** ${reason}`)).catch(() => null);
        }
        await guild.leave();
      }
    }

    await interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '⛔ تم الحظر', '⛔ Blacklisted'), L(l, `**${type === 'user' ? 'المستخدم' : 'السيرفر'}:** ${id}\n**السبب:** ${reason}`, `**${type === 'user' ? 'User' : 'Server'}:** ${id}\n**Reason:** ${reason}`))] });
  },
};
