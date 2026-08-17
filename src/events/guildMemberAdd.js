const { embed, successEmbed } = require('../utils/embed');
const { getSettings, getProtection, sendLog } = require('../services/logService');
const { db } = require('../utils/database');
const { formatNumber } = require('../utils/functions');
const logger = require('../utils/logger');
const inviteTracker = require('../services/inviteTracker');

const joinTracker = new Map();

function checkAntiRaid(guild, member) {
  const protection = getProtection(guild.id);
  const antiRaid = protection.antiRaid;
  if (!antiRaid || !antiRaid.enabled) return null;

  const now = Date.now();
  const arr = (joinTracker.get(guild.id) || []).filter((t) => now - t < (antiRaid.window || 10000));
  arr.push(now);
  joinTracker.set(guild.id, arr);

  if (arr.length > (antiRaid.limit || 8)) {
    return arr.length;
  }
  return null;
}

module.exports = {
  name: 'guildMemberAdd',
  async run(client, member) {
    const settings = getSettings(member.guild.id);

    const { updateCounters } = require('../commands/config/stats');
    updateCounters(member.guild).catch(() => null);

    // anti-bot
    if (member.user.bot) {
      const protection = getProtection(member.guild.id);
      if (protection.antiBot?.enabled && !protection.antiBot.whitelist.includes(member.user.id) && member.id !== client.user.id) {
        try {
          await member.kick('Anti-Bot: منع دخول البوتات');
          const alert = embed(member.guild, {
            title: '🤖 Anti-Bot',
            description: `تم طرد البوت **${member.user.tag}** من السيرفر`,
            color: 'warning',
          });
      await sendLog(member.guild, 'protection', alert);
        } catch {}
      }
      return;
    }

    // invite tracking
    inviteTracker.trackJoin(member).catch(() => {});

    // anti-alt
    const protection = getProtection(member.guild.id);
    if (protection.antiAlt?.enabled) {
      const ageDays = (Date.now() - member.user.createdTimestamp) / 86400000;
      if (ageDays < protection.antiAlt.maxAgeDays) {
        try {
          await member.kick(`Anti-Alt: عمر الحساب ${ageDays.toFixed(1)} يوم`);
          const alert = embed(member.guild, {
            title: '🕒 Anti-Alt',
            description: `تم طرد **${member.user.tag}** — عمر حسابه اقل من ${protection.antiAlt.maxAgeDays} يوم`,
            color: 'warning',
          });
          await sendLog(member.guild, 'protection', alert);
        } catch {}
        return;
      }
    }

    // verification
    if (protection.verification?.enabled) {
      const role = member.guild.roles.cache.get(protection.verification.role);
      if (role) {
        await member.roles.remove(role).catch(() => null);
        member.send({ embeds: [embed(member.guild, {
          title: '✅ توثيق حسابك',
          description: `اهلا **${member.user.username}** في **${member.guild.name}**!\nاضغط على زر التوثيق في لوحة التوثيق لتفعيل رولك`,
          footer: { text: member.guild.name },
        })] }).catch(() => null);
      }
    }

    // anti-raid
    const raidCount = checkAntiRaid(member.guild, member);
    if (raidCount) {
      try {
        await member.timeout(10 * 60 * 1000, 'Anti-Raid: دخول مكثف');
      } catch {}
      const alert = embed(member.guild, {
        title: '🚨 ريد اكتشف!',
        description: `تم تفعيل وضع الحماية بسبب دخول ${raidCount} عضو خلال فترة قصيرة\n**${member.user.tag}** تم اخماته مؤقتا`,
        color: 'warning',
      });
      await sendLog(member.guild, 'protection', alert);
      return;
    }

    // autorole
    if (settings.autorole) {
      const role = member.guild.roles.cache.get(settings.autorole);
      if (role) {
        try {
          await member.roles.add(role).catch(() => {});
        } catch {}
      }
    }

    // welcome
    if (settings.welcomeEnabled && settings.welcomeChannel) {
      const channel = member.guild.channels.cache.get(settings.welcomeChannel);
      if (channel && channel.isTextBased()) {
        const count = formatNumber(member.guild.memberCount);
        const welcome = embed(member.guild, {
          title: settings.welcomeMessage ? null : '👋 عضو جديد!',
          description: settings.welcomeMessage
            ? settings.welcomeMessage.replace(/{user}/g, member.user.toString()).replace(/{server}/g, member.guild.name).replace(/{count}/g, count)
            : `اهلا بك **${member.user.tag}** في **${member.guild.name}**!\nانت العضو رقم **#${count}**\nاستمتع بوقتك معنا 🎉`,
          thumbnail: member.user.displayAvatarURL({ size: 256 }),
          image: settings.welcomeImage || null,
        });
        try {
          await channel.send({ content: `${member.user}`, embeds: [welcome] });
        } catch {}
      }
    }

    // log
    const logEmbed = embed(member.guild, {
      title: '📥 دخول عضو',
      description: `**${member.user.tag}** (${member.user})`,
      fields: [
        { name: '🆔 الآيدي', value: member.user.id, inline: true },
        { name: '📅 انشئ الحساب', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
        { name: '👥 عدد الاعضاء', value: formatNumber(member.guild.memberCount), inline: true },
      ],
      thumbnail: member.user.displayAvatarURL({ size: 256 }),
      footer: { text: `الايدي: ${member.user.id}` },
    });
    await sendLog(member.guild, 'join', logEmbed);
  },
};
