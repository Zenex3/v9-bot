const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { embed, successEmbed, errorEmbed } = require('../../utils/embed');
const { L } = require('../../utils/i18n');
const { BACKUP_DIR, backupNow, restoreBackup } = require('../../utils/database');

module.exports = {
  category: 'owner',
  descEn: 'View & restore database backups (developer only)',
  data: new SlashCommandBuilder()
    .setName('backup')
    .setDescription('نسخ احتياطي للداتا (مطور فقط)')
    .setDescriptionLocalizations({ 'en-US': 'Database backups (developer only)' })
    .addSubcommand((s) => s.setName('now').setDescription('عمل نسخة احتياطية فورية').setDescriptionLocalizations({ 'en-US': 'Create a backup now' }))
    .addSubcommand((s) => s.setName('list').setDescription('عرض كل النسخ الاحتياطية').setDescriptionLocalizations({ 'en-US': 'List all backups' }))
    .addSubcommand((s) => s.setName('restore').setDescription('استرجاع نسخة احتياطية محددة').setDescriptionLocalizations({ 'en-US': 'Restore a backup' })
      .addStringOption((o) => o.setName('file').setDescription('اسم ملف النسخة الاحتياطية (شوفه من /backup list)').setRequired(true)))
    .setDefaultMemberPermissions(8),
  devOnly: true,
  async run(client, interaction) {
    const l = interaction.user.id;
    const sub = interaction.options.getSubcommand();

    if (sub === 'now') {
      backupNow();
      const files = fs.readdirSync(BACKUP_DIR).filter((f) => f.startsWith('backup-'));
      return interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '✅ تم الحفظ', '✅ Saved'), `${L(l, 'عدد النسخ الاحتياطية:', 'Backups count:')} **${files.length}**`)] });
    }

    if (sub === 'list') {
      const files = fs.readdirSync(BACKUP_DIR).filter((f) => f.startsWith('backup-')).sort().reverse();
      if (!files.length) {
        return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'لا توجد نسخ احتياطية بعد', 'No backups yet'))] });
      }
      const desc = files.map((f) => {
        const full = path.join(BACKUP_DIR, f);
        const size = (fs.statSync(full).size / 1024).toFixed(1) + ' KB';
        return `**${f}** — ${size}`;
      }).join('\n');
      return interaction.reply({ embeds: [embed(interaction.guild, { title: '💾 النسخ الاحتياطية', description: desc, color: 'info' })] });
    }

    if (sub === 'restore') {
      const file = interaction.options.getString('file');
      const full = path.join(BACKUP_DIR, file);
      if (!file.includes('backup-') || !fs.existsSync(full)) {
        return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'الملف غير موجود — استخدم /backup list', 'File not found — use /backup list'))] });
      }
      const ok = restoreBackup(full);
      return interaction.reply({ embeds: ok
        ? successEmbed(interaction.guild, L(l, '✅ تم الاسترجاع', '✅ Restored'), `${L(l, 'تم استرجاع النسخة:', 'Restored backup:')} **${file}**`)
        : errorEmbed(interaction.guild, '❌', L(l, 'فشل الاسترجاع', 'Restore failed')) });
    }
  },
};