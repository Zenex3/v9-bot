const { SlashCommandBuilder, ChannelType } = require('discord.js');
const { embed, successEmbed, errorEmbed } = require('../../utils/embed');
const { db, userKey, memberKey, getMember } = require('../../utils/database');
const { t } = require('../../utils/i18n');
const { isModerator } = require('../../utils/functions');

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CLAIM_WINDOW_MS = 24 * 60 * 60 * 1000;

function generateCode() {
  let code = '';
  for (let i = 0; i < 7; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return code;
}

function getConfig(guildId) {
  return db.guilds.ensure(guildId, 'referral', { enabled: false, logChannel: null, rewardRole: null });
}

function getUserCode(userId) {
  const u = db.users.ensure(userKey(userId), {});
  if (!u.code) {
    const codes = db.bot.ensure('referralCodes', {});
    let code;
    do { code = generateCode(); } while (codes[code]);
    u.code = code;
    db.users.set(userKey(userId), u);
    codes[code] = userId;
    db.bot.set('referralCodes', codes);
  }
  return u.code;
}

function hasAdmin(member) {
  return member?.permissions?.has('ManageGuild') || isModerator(member);
}

module.exports = {
  category: 'config',
  descEn: 'Referral system — invite new members with your code and earn rewards',
  data: new SlashCommandBuilder()
    .setName('referral')
    .setDescription('نظام الاحالات — كود لكل عضو والمكافآت للادارة')
    .setDescriptionLocalizations({ 'en-US': 'Referral system — invite members with a code and earn rewards' })
    .addSubcommand((s) => s.setName('code').setDescription('عرض كود الاحالة').setDescriptionLocalizations({ 'en-US': 'Show your referral code' }))
    .addSubcommand((s) => s.setName('use').setDescription('تفعيل كود احالة').setDescriptionLocalizations({ 'en-US': 'Use a referral code' }).addStringOption((o) => o.setName('code').setDescription('الكود').setDescriptionLocalizations({ 'en-US': 'Code' }).setRequired(true)))
    .addSubcommand((s) => s.setName('setup').setDescription('تفعيل النظام').setDescriptionLocalizations({ 'en-US': 'Enable the system' }).addChannelOption((o) => o.setName('channel').setDescription('قناة السجل').setDescriptionLocalizations({ 'en-US': 'Log channel' }).addChannelTypes(ChannelType.GuildText).setRequired(true)))
    .addSubcommand((s) => s.setName('reward').setDescription('رول المكافأة').setDescriptionLocalizations({ 'en-US': 'Reward role' }).addRoleOption((o) => o.setName('role').setDescription('الرول').setDescriptionLocalizations({ 'en-US': 'Role' }).setRequired(true)))
    .addSubcommand((s) => s.setName('disable').setDescription('ايقاف النظام').setDescriptionLocalizations({ 'en-US': 'Disable the system' }))
    .addSubcommand((s) => s.setName('status').setDescription('عرض حالة النظام').setDescriptionLocalizations({ 'en-US': 'Show system status' }))
    .setDefaultMemberPermissions(8),
  cooldown: 3000,
  async run(client, interaction) {
    const l = interaction.user.id;
    const sub = interaction.options.getSubcommand();
    const guild = interaction.guild;

    if (sub === 'code') {
      const code = getUserCode(interaction.user.id);
      const mem = getMember(guild.id, interaction.user.id);
      const count = mem.referral?.count || 0;
      return interaction.reply({
        embeds: [embed(guild, {
          title: t(l, 'ref_code_title'),
          description: t(l, 'ref_code_desc_text', code, count),
          color: 'info',
        })],
      });
    }

    if (sub === 'use') {
      return handleUse(client, interaction);
    }

    if (!hasAdmin(interaction.member)) {
      return interaction.reply({ embeds: [errorEmbed(guild, t(l, 'no_permission'), t(l, 'ref_unauthorized'))] });
    }

    const cfg = getConfig(guild.id);

    if (sub === 'setup') {
      const channel = interaction.options.getChannel('channel');
      cfg.enabled = true;
      cfg.logChannel = channel.id;
      db.guilds.set(guild.id, 'referral', cfg);
      return interaction.reply({ embeds: [successEmbed(guild, t(l, 'ref_enabled_title'), t(l, 'ref_enabled_desc', channel))] });
    }

    if (sub === 'reward') {
      const role = interaction.options.getRole('role');
      cfg.rewardRole = role.id;
      db.guilds.set(guild.id, 'referral', cfg);
      return interaction.reply({ embeds: [successEmbed(guild, t(l, 'ref_done_title'), t(l, 'ref_done_desc', role))] });
    }

    if (sub === 'disable') {
      cfg.enabled = false;
      db.guilds.set(guild.id, 'referral', cfg);
      return interaction.reply({ embeds: [successEmbed(guild, t(l, 'ref_disabled_title'), t(l, 'ref_disabled_desc'))] });
    }

    if (sub === 'status') {
      return interaction.reply({
        embeds: [embed(guild, {
          title: t(l, 'ref_status_title'),
          fields: [
            { name: t(l, 'ref_status'), value: cfg.enabled ? `✅ ${t(l, 'ref_enabled_state')}` : `❌ ${t(l, 'ref_disabled_state')}`, inline: true },
            { name: t(l, 'ref_log_label'), value: cfg.logChannel ? `<#${cfg.logChannel}>` : '—', inline: true },
            { name: t(l, 'ref_reward_label'), value: cfg.rewardRole ? `<@&${cfg.rewardRole}>` : '—', inline: true },
          ],
          color: 'info',
        })],
      });
    }
  },
};

async function handleUse(client, interaction) {
  const l = interaction.user.id;
  const guild = interaction.guild;
  const code = (interaction.options.getString('code') || '').trim().toUpperCase();
  if (!code) return interaction.reply({ embeds: [errorEmbed(guild, t(l, 'ref_invalid_code'), t(l, 'ref_invalid_code'))] });

  const codes = db.bot.ensure('referralCodes', {});
  const referrerId = codes[code];
  if (!referrerId) return interaction.reply({ embeds: [errorEmbed(guild, t(l, 'unknown_interaction'), t(l, 'ref_unknown_code'))] });
  if (referrerId === interaction.user.id) return interaction.reply({ embeds: [errorEmbed(guild, t(l, 'no_permission'), t(l, 'ref_own_code'))] });

  const joinedAt = interaction.member?.joinedTimestamp;
  if (joinedAt && Date.now() - joinedAt > CLAIM_WINDOW_MS) {
    return interaction.reply({ embeds: [errorEmbed(guild, t(l, 'error_generic'), t(l, 'ref_time_expired'))] });
  }

  const mem = getMember(guild.id, interaction.user.id);
  if (mem.referral?.claimed) {
    return interaction.reply({ embeds: [errorEmbed(guild, t(l, 'unknown_interaction'), t(l, 'ref_already_used'))] });
  }

  let referrer = guild.members.cache.get(referrerId);
  if (!referrer) referrer = await guild.members.fetch(referrerId).catch(() => null);
  if (!referrer) return interaction.reply({ embeds: [errorEmbed(guild, t(l, 'unknown_interaction'), t(l, 'ref_owner_missing'))] });

  mem.referral = { claimed: true, code, referrerId, at: Date.now() };
  db.members.set(memberKey(guild.id, interaction.user.id), mem);

  const cfg = getConfig(guild.id);
  const rmem = getMember(guild.id, referrerId);
  rmem.referral = rmem.referral || { claimed: false, count: 0 };
  rmem.referral.count = (rmem.referral.count || 0) + 1;
  db.members.set(memberKey(guild.id, referrerId), rmem);

  if (cfg.rewardRole) {
    const role = guild.roles.cache.get(cfg.rewardRole);
    if (role) await referrer.roles.add(role).catch(() => {});
  }

  if (cfg.logChannel) {
    const ch = guild.channels.cache.get(cfg.logChannel);
    if (ch && ch.isTextBased()) {
      await ch.send({ embeds: [embed(guild, {
        title: t(l, 'ref_new_title'),
        description: t(l, 'ref_new_desc', interaction.user.tag, interaction.user, referrer.user.tag, code, referrer.user.username, rmem.referral.count),
        color: 'success',
      })] }).catch(() => {});
    }
  }

  return interaction.reply({
    embeds: [successEmbed(guild, t(l, 'ref_activated_title'), t(l, 'ref_activated_desc', referrer.user.tag))],
  });
}
