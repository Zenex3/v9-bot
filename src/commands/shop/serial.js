const { SlashCommandBuilder } = require('discord.js');
const { embed, successEmbed, errorEmbed } = require('../../utils/embed');
const { L } = require('../../utils/i18n');
const { parseDuration, formatTime, relative, truncate } = require('../../utils/functions');
const {
  getShop,
  createSerials,
  deleteSerial,
  getSerial,
  listSerials,
  formatSerialList,
  sendSerialToUser,
  banUserFromSerial,
  unbanUserFromSerial,
  removeUserFromSerial,
} = require('../../services/shopService');

module.exports = {
  category: 'shop',
  descEn: 'Manage subscription serial keys (developer only)',
  data: new SlashCommandBuilder()
    .setName('serial')
    .setDescription('ادارة سيريالات الاشتراك (مطور فقط)')
    .setDescriptionLocalizations({ 'en-US': 'Manage shop serial keys (developer only)' })
    .addSubcommand((s) => s
      .setName('create')
      .setDescription('انشاء سيريالات اشتراك')
      .setDescriptionLocalizations({ 'en-US': 'Create subscription serials' })
      .addStringOption((o) => o.setName('duration').setDescription('المدة (مثال: 30d, 1w, 24h)').setRequired(true))
      .addStringOption((o) => o.setName('users').setDescription('ايديات المستخدمين مفصولين بفار — اتركه فاضي للعامة').setDescriptionLocalizations({ 'en-US': 'User IDs separated by comma — leave empty for public' }))
      .addIntegerOption((o) => o.setName('amount').setDescription('العدد لكل مستخدم (افتراضي 1)').setMinValue(1).setMaxValue(50)))
    .addSubcommand((s) => s
      .setName('list')
      .setDescription('عرض السيريالات')
      .setDescriptionLocalizations({ 'en-US': 'List serials' })
      .addStringOption((o) => o.setName('status').setDescription('الحالة').addChoices({ name: '🟢 متاح', value: 'unused' }, { name: '🔴 مستخدم', value: 'used' }, { name: 'الكل', value: 'all' })))
    .addSubcommand((s) => s
      .setName('info')
      .setDescription('معلومات سيريال')
      .setDescriptionLocalizations({ 'en-US': 'Serial info' })
      .addStringOption((o) => o.setName('key').setDescription('السيريال').setRequired(true)))
    .addSubcommand((s) => s
      .setName('delete')
      .setDescription('حذف سيريال')
      .setDescriptionLocalizations({ 'en-US': 'Delete a serial' })
      .addStringOption((o) => o.setName('key').setDescription('السيريال').setRequired(true)))
    .addSubcommand((s) => s
      .setName('send')
      .setDescription('ارسال سيريال للعميل في الخاص مع التعليمات')
      .setDescriptionLocalizations({ 'en-US': 'Send a serial to the customer in DMs with instructions' })
      .addUserOption((o) => o.setName('user').setDescription('العميل المستلم').setRequired(true))
      .addStringOption((o) => o.setName('key').setDescription('السيريال المرسل (اختياري — لو مترجعش انشئ جديد ب user+duration)'))
      .addStringOption((o) => o.setName('duration').setDescription('المدة عند انشاء سيريال جديد (مثال: 30d, 1w, 24h)'))
    )
    .addSubcommand((s) => s
      .setName('ban')
      .setDescription('حظر مستخدم من استخدام سيريال معين')
      .setDescriptionLocalizations({ 'en-US': 'Ban a user from using a specific serial' })
      .addStringOption((o) => o.setName('key').setDescription('السيريال').setRequired(true))
      .addUserOption((o) => o.setName('user').setDescription('المستخدم المراد حظره').setRequired(true)))
    .addSubcommand((s) => s
      .setName('unban')
      .setDescription('الغاء حظر مستخدم من سيريال معين')
      .setDescriptionLocalizations({ 'en-US': 'Unban a user from a specific serial' })
      .addStringOption((o) => o.setName('key').setDescription('السيريال').setRequired(true))
      .addUserOption((o) => o.setName('user').setDescription('المستخدم المراد الغاء حظره').setRequired(true)))
    .addSubcommand((s) => s
      .setName('removeuser')
      .setDescription('حذف مستخدم من قائمة مستخدمي السيريال')
      .setDescriptionLocalizations({ 'en-US': 'Remove a user from serial usage list' })
      .addStringOption((o) => o.setName('key').setDescription('السيريال').setRequired(true))
      .addUserOption((o) => o.setName('user').setDescription('المستخدم المراد حذفه').setRequired(true)))
    .setDefaultMemberPermissions(8),
  devOnly: true,
  async run(client, interaction) {
    const l = interaction.user.id;
    const sub = interaction.options.getSubcommand();
    const shop = getShop();

    if (sub === 'create') {
      const usersInput = interaction.options.getString('users');
      const durInput = interaction.options.getString('duration');
      const durationMs = parseDuration(durInput);
      if (!durationMs) {
        return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'مدة غير صالحة — استخدم مثال: 30d, 1w, 24h, 10m', 'Invalid duration — use e.g. 30d, 1w, 24h, 10m'))] });
      }
      const amount = interaction.options.getInteger('amount') || 1;

      const allKeys = [];
      const results = [];

      if (!usersInput || !usersInput.trim()) {
        const keys = createSerials({ userId: null, durationMs, amount, createdBy: interaction.user.id });
        allKeys.push(...keys);
        results.push(`**العامة (أي شخص):** ${keys.map(k => `\`${k}\``).join(' ')}`);
      } else {
        const userIds = usersInput.split(',').map(s => s.trim().replace(/[<@!>]/g, '')).filter(Boolean);
        for (const uid of userIds) {
          const member = await interaction.guild.members.fetch(uid).catch(() => null);
          const tag = member ? member.user.tag : uid;
          const keys = createSerials({ userId: uid, durationMs, amount, createdBy: interaction.user.id });
          allKeys.push(...keys);
          results.push(`**${tag}** (<@${uid}>): ${keys.map(k => `\`${k}\``).join(' ')}`);
        }
      }

      const desc = `**المدة:** ${formatTime(durationMs)}\n**العدد:** ${amount} لكل مستخدم\n**اجمالي السيريالات:** ${allKeys.length}\n\n${results.join('\n')}`;
      return interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '✅ تم انشاء السيريالات', '✅ Serials created'), desc)], ephemeral: true });
    }

    if (sub === 'list') {
      const status = interaction.options.getString('status') || 'all';
      const serials = listSerials({ status, limit: 500 });
      const desc = formatSerialList(serials, shop);
      return interaction.reply({
        embeds: [embed(interaction.guild, {
          title: `🔑 السيريالات (${serials.length} — الحد 500)`,
          description: desc,
          color: 'info',
        })],
      });
    }

    const key = interaction.options.getString('key');

    if (sub === 'info') {
      const serial = getSerial(key);
      if (!serial) {
        return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'السيريال غير موجود', 'Serial not found'))] });
      }
      const owner = serial.userId ? `<@${serial.userId}>` : L(l, '🌐 العامة (أي شخص)', '🌐 Public (anyone)');

      // نبني قائمة المستخدمين من الاشتراكات (كل من فعّل هذا السيريال) + سجل الاستخدام الجديد
      const seen = new Map();
      for (const [uid, sub] of Object.entries(shop.subscriptions || {})) {
        if (sub && sub.key === serial.key) {
          seen.set(uid, {
            userId: uid,
            tag: `ID: ${uid}`,
            usedAt: sub.activatedAt || serial.usedAt,
            expiresAt: sub.expiresAt || serial.expiresAt,
          });
        }
      }
      if (Array.isArray(serial.usageList)) {
        for (const u of serial.usageList) {
          if (u && u.userId !== null && u.userId !== undefined) {
            seen.set(String(u.userId), {
              userId: u.userId,
              tag: u.tag || `ID: ${u.userId}`,
              usedAt: u.usedAt,
              expiresAt: u.expiresAt,
            });
          }
        }
      }
      if (serial.usedBy && !seen.has(serial.usedBy)) {
        seen.set(serial.usedBy, {
          userId: serial.usedBy,
          tag: `ID: ${serial.usedBy}`,
          usedAt: serial.usedAt,
          expiresAt: serial.expiresAt,
        });
      }

      const users = [...seen.values()].sort((a, b) => (a.usedAt || 0) - (b.usedAt || 0));
      const usageCount = serial.usedCount || users.length;

      let usageLines = L(l, '_لا يوجد استخدام بعد_', '_No usage yet_');
      if (users.length) {
        usageLines = users.map((u, i) =>
          `${i + 1}) **${u.tag}** (<@${u.userId}>)\n   🕐 ${relative(u.usedAt)} | ⏳ ينتهي: ${relative(u.expiresAt)}`
        ).join('\n');
      } else if (serial.used) {
        usageLines = `1) **ID: ${serial.usedBy}** (<@${serial.usedBy}>)\n   🕐 ${relative(serial.usedAt)} | ⏳ ينتهي: ${relative(serial.expiresAt)}`;
      }

      const status = serial.used
        ? `🔴 مستخدم — المجموع: **${usageCount}** مرة`
        : (usageCount > 0 ? `🟢 متاح (استُخدم **${usageCount}** مرة)` : '🟢 متاح');

      let bannedLines = L(l, '_لا يوجد محظورون_', '_No banned users_');
      if (Array.isArray(serial.banned) && serial.banned.length) {
        bannedLines = serial.banned.map((uid, i) => `${i + 1}) **ID: ${uid}** (<@${uid}>)`).join('\n');
      }

      return interaction.reply({
        embeds: [embed(interaction.guild, {
          title: '🔑 معلومات السيريال',
          description: `**السيريال:** \`${serial.key}\`\n**مخصص ل:** ${owner}\n**المدة:** ${formatTime(serial.durationMs)}\n**تاريخ الانشاء:** ${relative(serial.createdAt)}\n**الحالة:** ${status}\n\n**👥 المستخدمون (${users.length || (serial.used ? 1 : 0)}):**\n${usageLines}\n\n**🚫 المحظورون (${serial.banned?.length || 0}):**\n${bannedLines}`,
          color: serial.used || usageCount > 0 ? 'warning' : 'success',
        })],
      });
    }

    if (sub === 'ban') {
      const target = interaction.options.getUser('user');
      if (!banUserFromSerial(key, target.id)) {
        return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'السيريال غير موجود', 'Serial not found'))] });
      }
      return interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '🚫 تم الحظر', '🚫 Banned'), `${L(l, 'تم حظر', 'Banned')} **${target.tag}** ${L(l, 'من استخدام السيريال', 'from this serial')} \`${key.toUpperCase()}\``)] });
    }

    if (sub === 'unban') {
      const target = interaction.options.getUser('user');
      if (!unbanUserFromSerial(key, target.id)) {
        return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'السيريال غير موجود', 'Serial not found'))] });
      }
      return interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '✅ تم الغاء الحظر', '✅ Unbanned'), `${L(l, 'تم الغاء حظر', 'Unbanned')} **${target.tag}** ${L(l, 'من السيريال', 'from the serial')} \`${key.toUpperCase()}\``)] });
    }

    if (sub === 'removeuser') {
      const target = interaction.options.getUser('user');
      if (!removeUserFromSerial(key, target.id)) {
        return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'السيريال غير موجود', 'Serial not found'))] });
      }
      const serial = getSerial(key);
      const left = (serial?.usageList || []).filter((u) => u && String(u.userId) !== String(target.id)).length;
      return interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '✅ تم الحذف', '✅ Removed'), `${L(l, 'تم حذف', 'Removed')} **${target.tag}** ${L(l, 'من قائمة مستخدمي السيريال', 'from serial users')} \`${key.toUpperCase()}\`\n${L(l, 'المستخدمون المتبقون:', 'Remaining users:')} **${left}**`)] });
    }

    if (sub === 'delete') {
      if (!deleteSerial(key)) {
        return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'السيريال غير موجود', 'Serial not found'))] });
      }
      return interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '✅ تم الحذف', '✅ Deleted'), `**${key.toUpperCase()}**`)] });
    }

    if (sub === 'send') {
      const target = interaction.options.getUser('user');
      const keyOpt = interaction.options.getString('key');
      const durInput = interaction.options.getString('duration');

      let serialKey = keyOpt;

      if (!serialKey) {
        const durationMs = parseDuration(durInput);
        if (!durationMs) {
          return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'اكتب سيريال موجود او مدة لانشاء واحد جديد (30d, 1w, 24h)', 'Provide an existing key or a duration to create a new one (30d, 1w, 24h)'))] });
        }
        serialKey = createSerials({ userId: target.id, durationMs, amount: 1, createdBy: interaction.user.id })[0];
      } else {
        const existing = getSerial(serialKey);
        if (!existing) {
          return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'السيريال غير موجود', 'Serial not found'))] });
        }
        if (existing.userId !== target.id) {
          return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'هذا السيريال مخصص لشخص اخر', 'This serial belongs to another user'))] });
        }
      }

      const result = await sendSerialToUser(client, target, serialKey);
      if (!result.ok) {
        if (result.reason === 'dm_closed') {
          return interaction.reply({ embeds: [errorEmbed(interaction.guild, '⚠️', L(l,
            `لا استطيع ارسال الخاص لـ **${target.tag}** — اغلق الخاص او مفيهوش بوت مشترك معه.\nالسيريال: \`${serialKey}\``,
            `Cannot DM **${target.tag}** — their DMs are closed or they have no shared server with the bot.\nSerial: \`${serialKey}\``))] });
        }
        return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'حدث خطا في الارسال', 'Send failed'))] });
      }

      return interaction.reply({
        embeds: [successEmbed(interaction.guild, L(l, '✅ تم ارسال السيريال', '✅ Serial sent'), L(l,
          `تم ارسال السيريال للخاص لـ **${target.tag}** مع كل التعليمات.\n\n🔑 **السيريال:** \`${serialKey}\``,
          `Serial sent to **${target.tag}** in DMs with full instructions.\n\n🔑 **Serial:** \`${serialKey}\``))],
        ephemeral: true,
      });
    }
  },
};
