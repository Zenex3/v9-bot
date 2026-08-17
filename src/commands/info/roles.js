const { SlashCommandBuilder } = require('discord.js');
const { embed, errorEmbed } = require('../../utils/embed');
const { L } = require('../../utils/i18n');

const PERM_NAMES = {
  Administrator: 'مشرف كامل (Administrator)',
  ViewChannel: 'مشاهدة القنوات',
  ManageChannels: 'إدارة القنوات',
  ManageRoles: 'إدارة الرولات',
  ManageGuild: 'إدارة السيرفر',
  ManageEvents: 'إدارة الفعاليات',
  ViewAuditLog: 'سجل العمليات',
  ManageWebhooks: 'إدارة الويب هوكس',
  ManageGuildExpressions: 'إدارة الإيموجي والاستيكرز',
  CreateGuildExpressions: 'إنشاء الإيموجي والاستيكرز',
  CreateInstantInvite: 'إنشاء الدعوات',
  ChangeNickname: 'تغيير اسمك',
  ManageNicknames: 'إدارة الألقاب',
  KickMembers: 'طرد الأعضاء',
  BanMembers: 'حظر الأعضاء',
  ModerateMembers: 'إسكات الأعضاء',
  SendMessages: 'إرسال الرسائل',
  SendMessagesInThreads: 'إرسال في الثريدات',
  CreatePublicThreads: 'إنشاء ثريدات عامة',
  CreatePrivateThreads: 'إنشاء ثريدات خاصة',
  EmbedLinks: 'إرسال روابط',
  AttachFiles: 'إرفاق ملفات',
  AddReactions: 'إضافة تفاعلات',
  UseExternalEmojis: 'إيموجي خارجي',
  UseExternalStickers: 'استيكرز خارجية',
  MentionEveryone: 'منشن الجميع',
  ManageMessages: 'إدارة الرسائل',
  ReadMessageHistory: 'قراءة سجل الرسائل',
  SendTTSMessages: 'رسائل صوتية',
  UseApplicationCommands: 'استخدام أوامر السلاش',
  VoiceConnect: 'الاتصال الصوتي',
  VoiceSpeak: 'التحدث الصوتي',
  VoiceMuteMembers: 'كتم الأعضاء صوتياً',
  VoiceDeafenMembers: 'إصمات الأعضاء',
  VoiceMoveMembers: 'نقل الأعضاء',
  VoiceUseVAD: 'استخدام كشف الصوت',
  PrioritySpeaker: 'متحدث مميز',
  Stream: 'بث الشاشة',
  UseEmbeddedActivities: 'الأنشطة الصوتية',
  ManageThreads: 'إدارة الثريدات',
  UseExternalSounds: 'أصوات خارجية',
  SendVoiceMessages: 'رسائل صوتية',
  SendPoll: 'إنشاء استطلاعات',
};

function formatPerms(perms, lang) {
  return perms
    .filter((p) => p !== 'Administrator')
    .map((p) => `✅ ${lang === 'en' ? p.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()) : (PERM_NAMES[p] || p)}`)
    .join('\n');
}

module.exports = {
  category: 'info',
  descEn: 'List roles or view a role info',
  data: new SlashCommandBuilder()
    .setName('roles')
    .setDescription('قائمة الادوار او معلومات رول')
    .setDescriptionLocalizations({ 'en-US': 'List roles or view a role info' })
    .addSubcommand((s) => s.setName('list').setDescription(L('x', 'قائمة الادوار', 'List roles')).setDescriptionLocalizations({ 'en-US': 'List roles' }))
    .addSubcommand((s) => s.setName('info').setDescription(L('x', 'معلومات رول', 'Role info')).setDescriptionLocalizations({ 'en-US': 'Role info' }).addRoleOption((o) => o.setName('role').setDescription(L('x', 'الرول', 'Role')).setDescriptionLocalizations({ 'en-US': 'Role' }).setRequired(true))),
  cooldown: 5000,
  async run(client, interaction) {
    const l = interaction.user.id;
    const sub = interaction.options.getSubcommand();

    if (sub === 'list') {
      const roles = interaction.guild.roles.cache
        .sort((a, b) => b.position - a.position)
        .filter((r) => r.id !== interaction.guild.id);
      const slice = [...roles.values()].slice(0, 20);
      const rolesEmbed = embed(interaction.guild, {
        title: `${L(l, '🎭 أدوار', '🎭 Roles')} ${interaction.guild.name}`,
        description: slice.map((r) => `${r} — **${r.members.size}** ${L(l, 'عضو', 'members')}`).join('\n') || L(l, 'لا توجد أدوار', 'No roles'),
      });
      return interaction.reply({ embeds: [rolesEmbed] });
    }

    if (sub === 'info') {
      const role = interaction.options.getRole('role');
      if (role.managed) return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'هذا رول تابع للتطبيقات', 'This is an integration-managed role'))], ephemeral: true });
      const lang = L(l, 'ar', 'en');
      const perms = Object.entries(role.permissions.serialize())
        .filter(([, v]) => v)
        .map(([p]) => p);
      const roleEmbed = embed(interaction.guild, {
        title: L(l, '🎭 معلومات الرول', '🎭 Role Info'),
        fields: [
          { name: L(l, '📛 الاسم', '📛 Name'), value: `${role} (\`${role.name}\`)`, inline: true },
          { name: '🆔 ID', value: role.id, inline: true },
          { name: L(l, '👥 الأعضاء', '👥 Members'), value: String(role.members.size), inline: true },
          { name: L(l, '📊 الترتيب', '📊 Position'), value: String(role.position), inline: true },
          { name: L(l, '🌈 اللون', '🌈 Color'), value: `#${role.color.toString(16).padStart(6, '0')}`, inline: true },
          { name: L(l, '📅 أُنشئ', '📅 Created'), value: `<t:${Math.floor(role.createdTimestamp / 1000)}:R>`, inline: true },
          { name: L(l, '🔓 يظهر منفصلاً', '🔓 Hoisted'), value: role.hoist ? L(l, '✅', '✅ Yes') : L(l, '❌', '❌ No'), inline: true },
          { name: L(l, '📣 قابل للذكر', '📣 Mentionable'), value: role.mentionable ? L(l, '✅', '✅ Yes') : L(l, '❌', '❌ No'), inline: true },
          ...(perms.length ? [{ name: L(l, '🛡️ الصلاحيات', '🛡️ Permissions'), value: (perms.includes('Administrator') ? `**${lang === 'ar' ? '👑 مشرف كامل' : '👑 Full Administrator'}**\n` : '') + (formatPerms(perms, lang).slice(0, 1000) || L(l, 'لا توجد صلاحيات خاصة', 'No special permissions')) }] : [{ name: L(l, '🛡️ الصلاحيات', '🛡️ Permissions'), value: L(l, 'لا توجد صلاحيات خاصة', 'No special permissions') }]),
        ],
        color: role.color || 'red',
      });
      return interaction.reply({ embeds: [roleEmbed] });
    }
  },
};
