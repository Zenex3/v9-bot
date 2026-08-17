const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { embed, successEmbed, errorEmbed } = require('../../utils/embed');
const { getProtection } = require('../../services/logService');
const { db } = require('../../utils/database');
const { L } = require('../../utils/i18n');

const ACTIONS = {
  warn: { ar: 'تحذير', en: 'Warn' },
  mute: { ar: 'اخمات 10 دقائق', en: 'Timeout 10m' },
  kick: { ar: 'طرد', en: 'Kick' },
  ban: { ar: 'حظر', en: 'Ban' },
};
const ACTION_CHOICES = Object.entries(ACTIONS).map(([value, label]) => ({ name: `${label.ar} (${label.en})`, value }));

function actionLabel(action) {
  return ACTIONS[action] ? ACTIONS[action].ar : action;
}

module.exports = {
  category: 'protection',
  descEn: 'Manage banned words, each with its own punishment',
  data: new SlashCommandBuilder()
    .setName('badwords')
    .setDescription('فلترة الكلمات الممنوعة — كل كلمة لها عقوبتها')
    .setDescriptionLocalizations({ 'en-US': 'Banned words filter — each word has its own punishment' })
    .setDefaultMemberPermissions(8)
    .addSubcommand((s) => s.setName('on').setDescription(L('x', 'تفعيل الفلترة', 'Enable the filter')).setDescriptionLocalizations({ 'en-US': 'Enable the filter' }))
    .addSubcommand((s) => s.setName('off').setDescription(L('x', 'ايقاف الفلترة', 'Disable the filter')).setDescriptionLocalizations({ 'en-US': 'Disable the filter' }))
    .addSubcommand((s) => s.setName('add').setDescription(L('x', 'اضافة كلمة وعقوبتها', 'Add a word with its punishment')).setDescriptionLocalizations({ 'en-US': 'Add a word with its punishment' })
      .addStringOption((o) => o.setName('word').setDescription(L('x', 'الكلمة', 'Word')).setDescriptionLocalizations({ 'en-US': 'Word' }).setRequired(true))
      .addStringOption((o) => o.setName('punishment').setDescription(L('x', 'العقوبة عند استخدامها', 'Punishment when used')).setDescriptionLocalizations({ 'en-US': 'Punishment when used' }).setRequired(true).addChoices(...ACTION_CHOICES)))
    .addSubcommand((s) => s.setName('remove').setDescription(L('x', 'حذف كلمة', 'Remove a word')).setDescriptionLocalizations({ 'en-US': 'Remove a word' }).addStringOption((o) => o.setName('word').setDescription(L('x', 'الكلمة', 'Word')).setDescriptionLocalizations({ 'en-US': 'Word' }).setRequired(true)))
    .addSubcommand((s) => s.setName('list').setDescription(L('x', 'عرض الكلمات وعقوباتها', 'List words and punishments')).setDescriptionLocalizations({ 'en-US': 'List words and punishments' })),
  async run(client, interaction) {
    const l = interaction.user.id;
    const sub = interaction.options.getSubcommand();
    const protection = getProtection(interaction.guild.id);
    const badWords = protection.badWords;

    if (sub === 'on' || sub === 'off') {
      badWords.enabled = sub === 'on';
      db.guilds.set(interaction.guild.id, 'protection', protection);
      return interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '🛡️ فلترة الكلمات', '🛡️ Bad Words Filter'), sub === 'on' ? L(l, 'تم التفعيل ✅', 'Enabled ✅') : L(l, 'تم الايقاف ❌', 'Disabled ❌'))] });
    }

    if (sub === 'add') {
      const word = interaction.options.getString('word');
      const punishment = interaction.options.getString('punishment');
      if (badWords.list.some((w) => w && w.word && w.word.toLowerCase() === word.toLowerCase())) {
        return interaction.reply({ embeds: [errorEmbed(interaction.guild, '⚠️', L(l, 'الكلمة موجودة بالفعل', 'Word already in the list'))], ephemeral: true });
      }
      badWords.list.push({ word, punishment });
      db.guilds.set(interaction.guild.id, 'protection', protection);
      return interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '✅ تمت الاضافة', '✅ Added'), L(l, `**${word}** اضيفت — العقوبة: ${actionLabel(punishment)}`, `**${word}** added — punishment: ${actionLabel(punishment)}`))] });
    }

    if (sub === 'remove') {
      const word = interaction.options.getString('word');
      const idx = badWords.list.findIndex((w) => w && w.word && w.word.toLowerCase() === word.toLowerCase());
      if (idx === -1) return interaction.reply({ embeds: [errorEmbed(interaction.guild, '⚠️', L(l, 'الكلمة غير موجودة', 'Word not in the list'))], ephemeral: true });
      badWords.list.splice(idx, 1);
      db.guilds.set(interaction.guild.id, 'protection', protection);
      return interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '✅ تم الحذف', '✅ Removed'), L(l, `**${word}** حذفت من القائمة`, `**${word}** removed from the list`))] });
    }

    if (sub === 'list') {
      const lines = badWords.list.length
        ? badWords.list.map((w) => `\`${w.word}\` → **${actionLabel(w.punishment)}**`).join('\n')
        : L(l, 'لا توجد كلمات', 'No words');
      return interaction.reply({ embeds: [embed(interaction.guild, { title: L(l, '📋 الكلمات الممنوعة', '📋 Banned Words'), description: lines })] });
    }
  },
};
