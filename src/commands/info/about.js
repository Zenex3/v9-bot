const { SlashCommandBuilder } = require('discord.js');
const { embed, row, ButtonBuilder, ButtonStyle } = require('../../utils/embed');
const { L } = require('../../utils/i18n');

module.exports = {
  category: 'info',
  descEn: 'About V9 Bot',
  data: new SlashCommandBuilder()
    .setName('about')
    .setDescription('معلومات عن البوت وتاريخه')
    .setDescriptionLocalizations({ 'en-US': 'About V9 Bot' }),
  cooldown: 3000,
  async run(client, interaction) {
    const l = interaction.user.id;
    const guilds = client.guilds.cache.size;
    const users = client.guilds.cache.reduce((a, g) => a + g.memberCount, 0);

    const aboutEmbed = embed(interaction.guild, {
      title: L(l, '🔥 V9 Bot — عن البوت', '🔥 V9 Bot — About'),
      description: L(l,
        '**V9 Bot** هو نظام سيرفرات متكامل بتصميم احترافي.\nتم تطويره ليكون الأقوى والأكثر تنظيماً في إدارة سيرفرك: معلومات، إدارة، إعدادات، حماية، مستويات وتحكم كامل للمالك.\n\nجميع الأوامر تدعم اللغتين **العربية** و**الإنجليزية**.',
        '**V9 Bot** is a complete server system.\nBuilt to be the strongest and most organized for managing your server: info, moderation, settings, protection, levels and full owner control.\n\nAll commands support **Arabic** and **English**.'),
      fields: [
        { name: L(l, '👥 السيرفرات', '👥 Servers'), value: String(guilds), inline: true },
        { name: L(l, '🧑‍🤝‍🧑 المستخدمون', '🧑‍🤝‍🧑 Users'), value: String(users), inline: true },
        { name: L(l, '⏱️ مدة التشغيل', '⏱️ Uptime'), value: `<t:${Math.floor((Date.now() - client.uptime) / 1000)}:R>`, inline: true },
      ],
      footer: { text: 'V9 Bot' },
    });

    const inviteBtn = new ButtonBuilder()
      .setLabel(L(l, '🔗 دعوة البوت', '🔗 Invite Bot'))
      .setStyle(ButtonStyle.Link)
      .setURL(`https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands`);
    const supportBtn = new ButtonBuilder().setLabel(L(l, '🌐 الموقع', '🌐 Website')).setStyle(ButtonStyle.Link).setURL('https://discord.com');

    await interaction.reply({ embeds: [aboutEmbed], components: [row(inviteBtn, supportBtn)] });
  },
};
