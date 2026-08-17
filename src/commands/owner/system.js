const { SlashCommandBuilder } = require('discord.js');
const { embed } = require('../../utils/embed');
const { L } = require('../../utils/i18n');
const os = require('os');

function fmtMs(ms) {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
}

function fmtBytes(b) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  while (b >= 1024 && i < units.length - 1) { b /= 1024; i++; }
  return `${b.toFixed(1)} ${units[i]}`;
}

module.exports = {
  category: 'owner',
  descEn: 'System information (developer only)',
  data: new SlashCommandBuilder()
    .setName('system')
    .setDescription('معلومات النظام (مطور فقط)')
    .setDescriptionLocalizations({ 'en-US': 'System information (developer only)' })
    .setDefaultMemberPermissions(8),
  devOnly: true,
  cooldown: 10000,
  async run(client, interaction) {
    const l = interaction.user.id;
    const mem = process.memoryUsage();
    const sysEmbed = embed(interaction.guild, {
      title: L(l, '🖥️ معلومات النظام', '🖥️ System Info'),
      fields: [
        { name: '🟢 Node.js', value: process.version, inline: true },
        { name: '📦 Discord.js', value: `v${require('discord.js').version}`, inline: true },
        { name: '⏱️ Uptime', value: fmtMs(client.uptime), inline: true },
        { name: '💾 الذاكرة المستخدمة', value: fmtBytes(mem.heapUsed) + ' / ' + fmtBytes(mem.heapTotal), inline: true },
        { name: '🧠 ذاكرة النظام', value: fmtBytes(os.totalmem() - os.freemem()) + ' / ' + fmtBytes(os.totalmem()), inline: true },
        { name: '⚙️ CPU', value: `${os.cpus()[0]?.model || '?'}`, inline: false },
        { name: '🌐 المنصة', value: `${os.platform()} ${os.arch()}`, inline: true },
        { name: '📡 بينق', value: `${Math.round(client.ws.ping)}ms`, inline: true },
        { name: '🧵 الخيوط', value: String(os.cpus().length), inline: true },
      ],
    });
    await interaction.reply({ embeds: [sysEmbed] });
  },
};
