const { SlashCommandBuilder, PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { embed, successEmbed, errorEmbed } = require('../../utils/embed');
const { L } = require('../../utils/i18n');

const sessions = new Map();

function token() {
  return Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
}

const PRIORITY_PERMS = [
  'ViewChannel', 'SendMessages', 'EmbedLinks', 'AttachFiles', 'AddReactions',
  'UseExternalEmojis', 'UseExternalStickers', 'MentionEveryone', 'ReadMessageHistory', 'ManageMessages',
  'CreateInstantInvite', 'ChangeNickname', 'ManageNicknames', 'SendMessagesInThreads', 'CreatePublicThreads',
  'CreatePrivateThreads', 'ManageThreads', 'UseApplicationCommands', 'SendVoiceMessages', 'SendPolls',
  'Connect', 'Speak', 'Stream', 'UseVAD',
];
const ALL_PERMS = [...PRIORITY_PERMS, ...Object.keys(PermissionFlagsBits).filter((k) => !PRIORITY_PERMS.includes(k))];
const CHUNKS = [ALL_PERMS.slice(0, 24), ALL_PERMS.slice(24, 48), ALL_PERMS.slice(48, 72)].filter((c) => c.length);
const CHUNK_LABELS = ['الصلاحيات العامة', 'صلاحيات الادارة والتنظيم', 'صلاحيات اخرى'];

const AR_DESC = {
  ViewChannel: 'مشاهدة الرومات',
  SendMessages: 'ارسال الرسائل',
  EmbedLinks: 'ارسال الروابط في الامبد',
  AttachFiles: 'ارسال الملفات',
  AddReactions: 'اضافة رياكشنات',
  MentionEveryone: 'منشن @everyone و @here',
  ReadMessageHistory: 'قراءة تاريخ الرسائل',
  ManageMessages: 'ادارة الرسائل وحذفها',
  ManageChannels: 'ادارة الرومات',
  ManageRoles: 'ادارة الرولات',
  ManageGuild: 'ادارة السيرفر',
  KickMembers: 'طرد الاعضاء',
  BanMembers: 'حظر الاعضاء',
  ModerateMembers: 'اخمات الاعضاء (timeout)',
  ManageWebhooks: 'ادارة الويب هوك',
  Administrator: 'ادارة شاملة',
};

function selectedPerms(session) {
  const set = new Set();
  for (const vals of session.perChunks.values()) {
    for (const v of vals) set.add(v);
  }
  return [...set];
}

function buildComponents(session) {
  const comps = [];
  CHUNKS.forEach((perms, i) => {
    comps.push(new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`cr_perm_${session.token}_${i}`)
        .setPlaceholder(`📌 ${CHUNK_LABELS[i]}`)
        .setMinValues(0)
        .setMaxValues(perms.length)
        .addOptions(perms.map((p) => ({
          label: p,
          description: AR_DESC[p] || undefined,
          value: p,
          emoji: selectedPerms(session).includes(p) ? '✅' : undefined,
        }))),
    ));
  });
  comps.push(new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`cr_go_${session.token}`).setLabel('✅ انشئ الرول').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`cr_cancel_${session.token}`).setLabel('❌ الغاء').setStyle(ButtonStyle.Danger),
  ));
  return comps;
}

function buildEmbed(session, guild) {
  const perms = selectedPerms(session);
  return embed(guild, {
    title: '🎭 انشاء رول مخصص',
    description: `**اسم الرول:** \`${session.name}\`\n**اللون:** ${session.color ? `\`#${session.color.toString(16).padStart(6, '0')}\`` : 'افتراضي'}\n\nاختر الصلاحيات التي تريدها من القوائم بالاسفل ثم اضغط **✅ انشئ الرول**\n\n${
      perms.length
        ? `**الصلاحيات المختارة (${perms.length}):**\n${perms.map((p) => `\`${p}\``).join(' ')}`
        : '_لا توجد صلاحيات مختارة بعد_'
    }`,
    color: 'info',
  });
}

async function handleSetupModal(client, interaction) {
  const name = interaction.fields.getTextInputValue('cr_name').trim();
  const colorInput = interaction.fields.getTextInputValue('cr_color').trim();
  if (!name) {
    return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', 'اسم الرول مطلوب')], ephemeral: true });
  }

  let color;
  if (colorInput) {
    const hex = colorInput.replace(/^#/, '');
    if (!/^[0-9a-fA-F]{6}$/.test(hex)) {
      return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', 'لون غير صالح — استخدم HEX مثل #ff0000')], ephemeral: true });
    }
    color = parseInt(hex, 16);
  }

  const session = { token: token(), userId: interaction.user.id, name, color, perChunks: new Map() };
  sessions.set(session.token, session);
  await interaction.reply({
    embeds: [buildEmbed(session, interaction.guild)],
    components: buildComponents(session),
    ephemeral: true,
  });
}

async function handlePermSelect(client, interaction) {
  const parts = interaction.customId.split('_');
  const tk = parts[2];
  const idx = parseInt(parts[3], 10);
  const session = sessions.get(tk);
  if (!session) {
    return interaction.reply({ content: 'انتهت صلاحية الجلسة، اعد استخدام الامر', ephemeral: true });
  }
  if (session.userId !== interaction.user.id) {
    return interaction.reply({ content: 'هذا ليس طلبك', ephemeral: true });
  }
  session.perChunks.set(idx, interaction.values);
  await interaction.update({
    embeds: [buildEmbed(session, interaction.guild)],
    components: buildComponents(session),
  });
}

async function handleDone(client, interaction) {
  const parts = interaction.customId.split('_');
  const tk = parts[2];
  const session = sessions.get(tk);
  if (!session) {
    return interaction.reply({ content: 'انتهت صلاحية الجلسة، اعد استخدام الامر', ephemeral: true });
  }
  if (session.userId !== interaction.user.id) {
    return interaction.reply({ content: 'هذا ليس طلبك', ephemeral: true });
  }

  if (interaction.customId.startsWith('cr_cancel_')) {
    sessions.delete(tk);
    return interaction.update({
      embeds: [embed(interaction.guild, { title: '❌ تم الالغاء', color: 'error' })],
      components: [],
    });
  }

  const perms = selectedPerms(session);
  const hasAdmin = perms.includes('Administrator');
  const cleanPerms = hasAdmin ? [PermissionFlagsBits.Administrator] : perms.map((p) => PermissionFlagsBits[p]).filter(Boolean);

  const me = interaction.guild.members.me;
  if (me && !me.permissions.has(PermissionFlagsBits.ManageRoles)) {
    sessions.delete(tk);
    return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', 'البوت لا يملك صلاحية ادارة الرولات')], ephemeral: true });
  }

  try {
    const role = await interaction.guild.roles.create({
      name: session.name,
      color: session.color ?? undefined,
      permissions: cleanPerms,
    });
    sessions.delete(tk);
    const desc = `✅ تم انشاء الرول ${role}\n**اللون:** ${session.color ? `\`#${session.color.toString(16).padStart(6, '0')}\`` : 'افتراضي'}\n${
      perms.length ? `**الصلاحيات (${perms.length}):**\n${perms.map((p) => `\`${p}\``).join(' ')}` : '_بدون صلاحيات_'
    }`;
    return interaction.update({ embeds: [successEmbed(interaction.guild, '🎭 تم انشاء الرول', desc)], components: [] });
  } catch (e) {
    sessions.delete(tk);
    return interaction.update({ embeds: [errorEmbed(interaction.guild, '❌', `فشل انشاء الرول: ${e.message}`)], components: [] });
  }
}

module.exports = {
  category: 'moderation',
  descEn: 'Create a role with a picker UI',
  data: new SlashCommandBuilder()
    .setName('createrole')
    .setDescription('انشاء رول بصلاحيات من قوائم اختيار')
    .setDescriptionLocalizations({ 'en-US': 'Create a role with a picker UI' })
    .setDefaultMemberPermissions(8),
  botPermissions: [PermissionFlagsBits.ManageRoles],
  async run(client, interaction) {
    const modal = new ModalBuilder()
      .setCustomId('cr_setup')
      .setTitle('🎭 انشاء رول مخصص')
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('cr_name').setLabel('اسم الرول').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(100),
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('cr_color').setLabel('اللون HEX (اختياري) مثال: #ff0000').setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(7),
        ),
      );
    return interaction.showModal(modal);
  },
  components: {
    'cr_perm_*': handlePermSelect,
    'cr_go_*': handleDone,
    'cr_cancel_*': handleDone,
    'cr_setup': handleSetupModal,
  },
};
