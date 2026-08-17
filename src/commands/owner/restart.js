const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embed');
const { L } = require('../../utils/i18n');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const logger = require('../../utils/logger');

module.exports = {
  category: 'owner',
  descEn: 'Restart the bot (developer only)',
  data: new SlashCommandBuilder()
    .setName('restart')
    .setDescription('اعادة تشغيل البوت (مطور فقط)')
    .setDescriptionLocalizations({ 'en-US': 'Restart the bot (developer only)' })
    .setDefaultMemberPermissions(8),
  devOnly: true,
  async run(client, interaction) {
    const l = interaction.user.id;
    const root = path.join(__dirname, '..', '..', '..');
    const logsDir = path.join(root, 'logs');
    if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

    await interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '🔄 جاري اعادة التشغيل...', '🔄 Restarting...'), L(l, 'يتم اعادة تشغيل البوت الان، انتظر ثواني', 'The bot is restarting now, wait a few seconds'))] });

    setTimeout(() => {
      try {
        const lockFile = path.join(root, 'data', 'bot.lock');
        try { if (fs.existsSync(lockFile)) fs.unlinkSync(lockFile); } catch {}

        const out = fs.openSync(path.join(logsDir, 'out.log'), 'a');
        const err = fs.openSync(path.join(logsDir, 'err.log'), 'a');
        const child = spawn(process.execPath, ['index.js'], {
          cwd: root,
          detached: true,
          stdio: ['ignore', out, err],
          env: {
            ...process.env,
            RESTART_USER: interaction.user.id,
            RESTART_CHANNEL: interaction.channelId,
            RESTART_GUILD: interaction.guildId,
          },
        });
        child.unref();
        logger.info(`اعادة التشغيل: تم تشغيل عملية جديدة (PID ${child.pid})`);
      } catch (e) {
        logger.error('فشل اعادة تشغيل البوت:', e.message);
      }
      process.exit(0);
    }, 1500);
  },
};
