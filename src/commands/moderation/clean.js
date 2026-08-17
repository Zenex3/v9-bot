const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { embed, errorEmbed } = require('../../utils/embed');
const { sendLog } = require('../../services/logService');
const { L } = require('../../utils/i18n');
const logger = require('../../utils/logger');

module.exports = {
  category: 'moderation',
  descEn: 'Delete messages in a channel',
  data: new SlashCommandBuilder()
    .setName('clean')
    .setDescription('حذف رسائل من القناة')
    .setDescriptionLocalizations({ 'en-US': 'Delete messages in a channel' })
    .setDefaultMemberPermissions(8)
    .addIntegerOption((o) => o.setName('amount').setDescription(L('x', 'عدد الرسائل (اتركه فارغا لمسح كل شيء)', 'Number of messages (leave empty to delete all)')).setDescriptionLocalizations({ 'en-US': 'Number of messages (leave empty to delete all)' }).setRequired(false).setMinValue(1)),
  botPermissions: [PermissionFlagsBits.ManageMessages, PermissionFlagsBits.ReadMessageHistory],
  async run(client, interaction) {
    const l = interaction.user.id;
    const amount = interaction.options.getInteger('amount');
    await interaction.deferReply({ ephemeral: true });

    const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
    const debugLog = (msg) => {
      try {
        const logPath = path.join(__dirname, '..', '..', '..', 'logs', 'clean-debug.log');
        fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${msg}\n`);
      } catch {}
    };

    let deleted = 0;
    const deleteAll = !amount;

    while (deleteAll || deleted < amount) {
      const batchSize = deleteAll ? 100 : Math.min(100, amount - deleted);
      const msgs = await interaction.channel.messages.fetch({ limit: Math.min(batchSize, 100) }).catch((e) => {
        debugLog(`FETCH_ERROR: ${e.message} (code=${e.code})`);
        return null;
      });
      if (!msgs || !msgs.size) break;
      const toDelete = msgs.first(Math.min(msgs.size, 100));

      // 1) Try bulk delete (works only for messages < 14 days old)
      let res = null;
      let bulkFailed = false;
      try {
        res = await interaction.channel.bulkDelete(toDelete, false);
      } catch (e) {
        bulkFailed = true;
        debugLog(`BULK_ERROR: ${e.message} (code=${e.code}, status=${e.status})`);
        res = null;
      }

      // 2) If bulk failed for ANY reason, delete one-by-one (works for any age)
      if (bulkFailed || !res || !res.size) {
        let ok = 0;
        for (const m of toDelete.values()) {
          try {
            await m.delete();
            ok++;
          } catch (e) {
            debugLog(`SINGLE_ERROR id=${m.id}: ${e.message} (code=${e.code})`);
          }
          await sleep(350);
        }
        debugLog(`BATCH: bulkFailed=${bulkFailed} attempted=${toDelete.size} singleOk=${ok}`);
        deleted += ok;
        if (ok < toDelete.size) break;
        continue;
      }

      deleted += res.size;
      if (res.size < 2) break;
    }

    debugLog(`DONE: totalDeleted=${deleted}`);

    if (!deleted) {
      return interaction.editReply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'فشل حذف الرسائل', 'Failed to delete messages'))] });
    }
    const desc = deleteAll
      ? L(l, `حذفت **${deleted}** رسالة من ${interaction.channel}`, `Deleted **${deleted}** messages from ${interaction.channel}`)
      : L(l, `حذفت **${deleted}** رسالة من ${interaction.channel}`, `Deleted **${deleted}** messages from ${interaction.channel}`);
    await interaction.editReply({ embeds: [embed(interaction.guild, { title: L(l, '🧹 تم الحذف', '🧹 Deleted'), description: desc, color: 'success' })] });
    await sendLog(interaction.guild, 'mod', embed(interaction.guild, { title: L(l, '🧹 حذف رسائل', '🧹 Message purge'), description: L(l, `حذف **${deleted}** رسالة من ${interaction.channel} بواسطة **${interaction.user.tag}**`, `Deleted **${deleted}** messages from ${interaction.channel} by **${interaction.user.tag}**`) }));
  },
};
