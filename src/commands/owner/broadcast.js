const { SlashCommandBuilder, StringSelectMenuBuilder, ActionRowBuilder, ComponentType } = require('discord.js');
const { L } = require('../../utils/i18n');
const { embed } = require('../../utils/embed');

const pending = new Map();

module.exports = {
  category: 'owner',
  descEn: 'Broadcast a message to all or a selected server (developer only)',
  data: new SlashCommandBuilder()
    .setName('broadcast')
    .setDescription('ارسال رسالة (مطور فقط)')
    .setDescriptionLocalizations({ 'en-US': 'Broadcast a message (developer only)' })
    .addStringOption((o) => o.setName('message').setDescription(L('x', 'الرسالة', 'Message')).setDescriptionLocalizations({ 'en-US': 'Message' }).setRequired(true))
    .addStringOption((o) => o.setName('target').setDescription(L('x', 'الهدف', 'Target')).setDescriptionLocalizations({ 'en-US': 'Target' }).addChoices(
      { name: L('x', 'كل السيرفرات', 'All servers'), value: 'all' },
      { name: L('x', 'سيرفر محدد', 'Specific server'), value: 'server' }))
    .setDefaultMemberPermissions(8),
  devOnly: true,
  cooldown: 30000,
  async run(client, interaction) {
    const l = interaction.user.id;
    const message = interaction.options.getString('message');
    const target = interaction.options.getString('target') || 'all';

    if (target === 'all') {
      await interaction.deferReply({ ephemeral: true });
      let sent = 0;
      let failed = 0;
      for (const guild of client.guilds.cache.values()) {
        const channel = guild.channels.cache
          .filter((c) => c.isTextBased() && c.permissionsFor(guild.members.me)?.has('SendMessages'))
          .sort((a, b) => a.position - b.position)
          .first();
        if (!channel) { failed++; continue; }
        try {
          await channel.send({ embeds: [buildBroadcast(guild, message, l)] });
          sent++;
        } catch { failed++; }
      }
      return interaction.editReply({ embeds: [embed(interaction.guild, { title: L(l, '📢 البث', '📢 Broadcast'), description: L(l, `تم الارسال إلى **${sent}** سيرفر\nفشل: **${failed}**`, `Sent to **${sent}** servers\nFailed: **${failed}**`), color: 'success' })] });
    }

    pending.set(l, { message });
    const guilds = [...client.guilds.cache.values()].slice(0, 25);
    if (!guilds.length) {
      return interaction.reply({ embeds: [embed(interaction.guild, { title: '❌', description: L(l, 'لا توجد سيرفرات', 'No servers available'), color: 'error' })], ephemeral: true });
    }
    const menu = new StringSelectMenuBuilder()
      .setCustomId('broadcast_guild')
      .setPlaceholder(L(l, '🌐 اختر السيرفر', '🌐 Select a server'))
      .addOptions(guilds.map((g) => ({ label: g.name.slice(0, 90), value: g.id, description: `${g.memberCount} ${L(l, 'عضو', 'members')}` })));
    return interaction.reply({
      content: L(l, '📢 اختر السيرفر الذي تريد الارسال إليه:', '📢 Select the server to broadcast to:'),
      components: [new ActionRowBuilder().addComponents(menu)],
      ephemeral: true,
    });
  },
};

function buildBroadcast(guild, message, l) {
  return embed(guild, {
    title: L(l, '📢 اعلان', '📢 Announcement'),
    description: message,
    footer: { text: 'V9 Bot' },
  });
}

async function handleGuildSelect(client, interaction) {
  const l = interaction.user.id;
  const state = pending.get(l);
  if (!state) return interaction.update({ content: L(l, 'انتهت الجلسة، اعد استخدام الامر', 'Session expired, run the command again'), components: [] });
  const guildId = interaction.values[0];
  const guild = client.guilds.cache.get(guildId);
  if (!guild) return interaction.update({ content: L(l, 'السيرفر غير موجود', 'Server not found'), components: [] });

  const channels = guild.channels.cache
    .filter((c) => c.isTextBased() && c.permissionsFor(guild.members.me)?.has('SendMessages'))
    .sort((a, b) => a.position - b.position)
    .first(25);
  if (!channels.length) return interaction.update({ content: L(l, 'لا توجد قنوات صالحة في هذا السيرفر', 'No valid channels in this server'), components: [] });

  pending.set(l, { ...state, guildId });
  const menu = new StringSelectMenuBuilder()
    .setCustomId('broadcast_channel')
    .setPlaceholder(L(l, '📌 اختر الروم', '📌 Select a channel'))
    .addOptions(channels.map((c) => ({ label: `#${c.name}`.slice(0, 90), value: c.id })));
  return interaction.update({
    content: L(l, `📢 اختر الروم في **${guild.name}**:`, `📢 Select the channel in **${guild.name}**:`),
    components: [new ActionRowBuilder().addComponents(menu)
    .setDefaultMemberPermissions(8)],
  });
}

async function handleChannelSelect(client, interaction) {
  const l = interaction.user.id;
  const state = pending.get(l);
  if (!state) return interaction.update({ content: L(l, 'انتهت الجلسة، اعد استخدام الامر', 'Session expired, run the command again'), components: [] });
  const guild = client.guilds.cache.get(state.guildId);
  const channel = guild?.channels.cache.get(interaction.values[0]);
  if (!channel) return interaction.update({ content: L(l, 'القناة غير موجودة', 'Channel not found'), components: [] });

  try {
    await channel.send({ embeds: [buildBroadcast(guild, state.message)] });
    pending.delete(l);
    return interaction.update({ content: L(l, `✅ تم ارسال الرسالة إلى **#${channel.name}**`, `✅ Message sent to **#${channel.name}**`), components: [] });
  } catch (e) {
    return interaction.update({ content: L(l, `❌ فشل الارسال: ${e.message}`, `❌ Failed to send: ${e.message}`), components: [] });
  }
}

module.exports.pending = pending;
module.exports.components = {
  'broadcast_guild': handleGuildSelect,
  'broadcast_channel': handleChannelSelect,
};
