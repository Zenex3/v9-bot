const { SlashCommandBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const { embed, row } = require('../../utils/embed');
const { getLang, setLang, t, LANG_AR, LANG_EN } = require('../../utils/i18n');
const { db, userKey } = require('../../utils/database');

module.exports = {
  category: 'config',
  data: new SlashCommandBuilder()
    .setName('language')
    .setDescription('اختيار لغة البوت / Choose bot language')
    .setDescriptionLocalizations({ 'en-US': 'Choose bot language' })
    .setDefaultMemberPermissions(8),
  cooldown: 3000,
  async run(client, interaction) {
    await interaction.reply(buildLanguageMenu(interaction.user.id, interaction.guild));
  },
};

function buildLanguageMenu(userId, guild) {
  const current = getLang(userId);

  const menu = new StringSelectMenuBuilder()
    .setCustomId('language_select')
    .setPlaceholder(t(userId, 'lang_placeholder'))
    .addOptions([
      new StringSelectMenuOptionBuilder()
        .setLabel('العربية 🇪🇬')
        .setValue(LANG_AR)
        .setDescription('الرد باللغة العربية / Reply in Arabic'),
      new StringSelectMenuOptionBuilder()
        .setLabel('English 🇬🇧')
        .setValue(LANG_EN)
        .setDescription('Reply in English / الرد بالانجليزية'),
    ]);

  const langEmbed = embed(guild, {
    title: t(userId, 'lang_title'),
    description: `${t(userId, 'lang_description')}\n\n${t(userId, 'lang_current')}: ${current === LANG_AR ? 'العربية 🇪🇬' : 'English 🇬🇧'}`,
  });

  return { embeds: [langEmbed], components: [row(menu)] };
}

async function handleLanguageSelect(client, interaction) {
  const lang = interaction.values[0];
  setLang(interaction.user.id, lang);
  const response = lang === LANG_AR ? '✅ تم اختيار اللغة: **العربية** 🇪🇬' : '✅ Language set to: **English** 🇬🇧';

  const langEmbed = embed(interaction.guild, {
    title: '🌐 ' + (lang === LANG_AR ? 'اختيار اللغة' : 'Choose Language'),
    description: response,
  });

  await interaction.update({ embeds: [langEmbed], components: [] });
}

module.exports.components = { 'language_select': handleLanguageSelect };
module.exports.buildLanguageMenu = buildLanguageMenu;
