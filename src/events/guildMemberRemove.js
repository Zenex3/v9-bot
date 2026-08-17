const { AuditLogEvent } = require('discord.js');
const { embed } = require('../utils/embed');
const { getSettings, sendLog } = require('../services/logService');
const { formatNumber } = require('../utils/functions');

async function getKick(member) {
  try {
    const logs = await member.guild.fetchAuditLogs({ type: AuditLogEvent.MemberKick, limit: 5 });
    const entry = logs.entries.find((e) => e.target?.id === member.id && Date.now() - e.createdTimestamp < 20000);
    return entry || null;
  } catch {
    return null;
  }
}

module.exports = {
  name: 'guildMemberRemove',
  async run(client, member) {
    if (member.user.bot) return;

    const settings = getSettings(member.guild.id);

    const { updateCounters } = require('../commands/config/stats');
    updateCounters(member.guild).catch(() => null);

    // leave message
    if (settings.leaveEnabled && settings.leaveChannel) {
      const channel = member.guild.channels.cache.get(settings.leaveChannel);
      if (channel && channel.isTextBased()) {
        const count = formatNumber(member.guild.memberCount);
        const leave = embed(member.guild, {
          title: settings.leaveMessage ? null : '👋 وداعا',
          description: settings.leaveMessage
            ? settings.leaveMessage.replace(/{user}/g, member.user.toString()).replace(/{server}/g, member.guild.name).replace(/{count}/g, count)
            : `**${member.user.tag}** غادر السيرفر\nنتمنى ان ترجع قريبا 🥲`,
          thumbnail: member.user.displayAvatarURL({ size: 256 }),
          image: settings.leaveImage || null,
        });
        try {
          await channel.send({ embeds: [leave] });
        } catch {}
      }
    }

    // log
    const kick = await getKick(member);
    if (kick) {
      const kickEmbed = embed(member.guild, {
        title: '🥾 كيك',
        description: `تم كيك **${member.user.tag}** (${member.user})`,
        fields: [
          { name: '🆔 الآيدي', value: member.user.id, inline: true },
          { name: '👮 المنفذ', value: kick.executor ? `${kick.executor.tag} (${kick.executor})` : 'غير معروف', inline: true },
          { name: '📄 السبب', value: kick.reason || 'غير محدد', inline: true },
          { name: '🎭 الادوار', value: member.roles.cache.filter((r) => r.id !== member.guild.id).map((r) => r.name).slice(0, 10).join(', ') || 'لا يوجد', inline: false },
        ],
        thumbnail: member.user.displayAvatarURL({ size: 256 }),
        footer: { text: `الايدي: ${member.user.id}` },
      });
      await sendLog(member.guild, 'kick', kickEmbed);
    } else {
      const logEmbed = embed(member.guild, {
        title: '📤 خروج عضو',
        description: `**${member.user.tag}** (${member.user})`,
        fields: [
          { name: '🆔 الآيدي', value: member.user.id, inline: true },
          { name: '📅 انضم', value: member.joinedAt ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'غير معروف', inline: true },
          { name: '👥 عدد الاعضاء', value: formatNumber(member.guild.memberCount), inline: true },
          { name: '🎭 الادوار', value: member.roles.cache.filter((r) => r.id !== member.guild.id).map((r) => r.name).slice(0, 10).join(', ') || 'لا يوجد', inline: false },
        ],
        thumbnail: member.user.displayAvatarURL({ size: 256 }),
      });
      await sendLog(member.guild, 'leave', logEmbed);
    }
  },
};
