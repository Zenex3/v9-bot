const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embed');
const { db, userKey } = require('../../utils/database');
const { t } = require('../../utils/i18n');

module.exports = {
  category: 'info',
  descEn: 'Set your AFK status — the bot auto-replies when someone mentions you',
  data: new SlashCommandBuilder()
    .setName('afk')
    .setDescription('وضع الافك — البوت يرد تلقائيا عند عمل منشن لك')
    .setDescriptionLocalizations({ 'en-US': 'AFK status — the bot auto-replies when you are mentioned' })
    .addSubcommand((s) => s.setName('set').setDescription('تفعيل وضع الافك مع سبب').setDescriptionLocalizations({ 'en-US': 'Set AFK with a reason' }).addStringOption((o) => o.setName('reason').setDescription('السبب (اختياري)').setDescriptionLocalizations({ 'en-US': 'Reason (optional)' })))
    .addSubcommand((s) => s.setName('off').setDescription('ازالة وضع الافك').setDescriptionLocalizations({ 'en-US': 'Remove AFK status' })),
  cooldown: 5000,
  async run(client, interaction) {
    const l = interaction.user.id;
    const sub = interaction.options.getSubcommand();
    const u = db.users.ensure(userKey(interaction.user.id), {});

    if (sub === 'off') {
      if (!u.afk) {
        return interaction.reply({ embeds: [errorEmbed(interaction.guild, t(l, 'afk_not_active'), t(l, 'afk_use_set'))] });
      }
      delete u.afk;
      db.users.set(userKey(interaction.user.id), u);
      return interaction.reply({ embeds: [successEmbed(interaction.guild, t(l, 'afk_removed'), t(l, 'afk_welcome_back'))] });
    }

    const reason = interaction.options.getString('reason') || t(l, 'afk_no_reason');
    u.afk = { reason, since: Date.now(), channelId: interaction.channel?.id || null };
    db.users.set(userKey(interaction.user.id), u);

    return interaction.reply({
      embeds: [successEmbed(interaction.guild, t(l, 'afk_active_title'), t(l, 'afk_active_desc', reason))],
    });
  },
};
