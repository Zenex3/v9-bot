const { SlashCommandBuilder, PermissionFlagsBits, WebhookClient, ChannelType } = require('discord.js');
const { embed, successEmbed, errorEmbed } = require('../../utils/embed');
const { db } = require('../../utils/database');
const { L } = require('../../utils/i18n');

function isImageURL(url) {
  return /^https?:\/\/\S+\.(png|jpe?g|gif|webp|bmp)(\?\S*)?$/i.test(url);
}

function parseWebhookUrl(input) {
  const match = String(input).trim().match(/^https:\/\/(?:discord(?:app)?\.com|ptb\.discord\.com)\/api\/webhooks\/(\d+)\/([A-Za-z0-9_-]+)$/);
  return match ? { id: match[1], token: match[2] } : null;
}

function getSaved(guildId) {
  return db.guilds.get(guildId, 'webhook');
}

function clientFrom(saved) {
  return new WebhookClient({ id: saved.id, token: saved.token });
}

module.exports = {
  category: 'config',
  descEn: 'Send messages through a saved webhook',
  data: new SlashCommandBuilder()
    .setName('webhook')
    .setDescription('ارسال رسائل عبر ويبهوك محفوظ')
    .setDescriptionLocalizations({ 'en-US': 'Send messages through a saved webhook' })
    .setDefaultMemberPermissions(8)
    .addSubcommand((s) => s.setName('setup').setDescription(L('x', 'انشاء ويبهوك في روم باسمك وصورتك وحفظه', 'Create a webhook in a channel with your name and avatar, then save it')).setDescriptionLocalizations({ 'en-US': 'Create a webhook in a channel with your name and avatar, then save it' })
      .addChannelOption((o) => o.setName('channel').setDescription(L('x', 'الروم الذي سيُنشأ فيه الويبهوك', 'Channel to create the webhook in')).setDescriptionLocalizations({ 'en-US': 'Channel to create the webhook in' }).addChannelTypes(ChannelType.GuildText).setRequired(true)))
    .addSubcommand((s) => s.setName('seturl').setDescription(L('x', 'حفظ رابط ويبهوك خاص بك', 'Save your own webhook URL')).setDescriptionLocalizations({ 'en-US': 'Save your own webhook URL' })
      .addStringOption((o) => o.setName('url').setDescription(L('x', 'رابط الويبهوك', 'Webhook URL')).setDescriptionLocalizations({ 'en-US': 'Webhook URL' }).setRequired(true)))
    .addSubcommand((s) => s.setName('send').setDescription(L('x', 'ارسال رسالة عبر الويبهوك المحفوظ', 'Send a message through the saved webhook')).setDescriptionLocalizations({ 'en-US': 'Send a message through the saved webhook' })
      .addStringOption((o) => o.setName('message').setDescription(L('x', 'نص الرسالة', 'Message text')).setDescriptionLocalizations({ 'en-US': 'Message text' }).setRequired(true))
      .addBooleanOption((o) => o.setName('by').setDescription(L('x', 'اظهار سطر By @mention تحتها (افتراضي: نعم)', 'Show a By @mention line below it (default: yes)')).setDescriptionLocalizations({ 'en-US': 'Show a By @mention line below it (default: yes)' })))
    .addSubcommand((s) => s.setName('info').setDescription(L('x', 'عرض معلومات الويبهوك المحفوظ', 'Show saved webhook info')).setDescriptionLocalizations({ 'en-US': 'Show saved webhook info' }))
    .addSubcommand((s) => s.setName('remove').setDescription(L('x', 'حذف الويبهوك المحفوظ', 'Remove the saved webhook')).setDescriptionLocalizations({ 'en-US': 'Remove the saved webhook' })),
  botPermissions: [PermissionFlagsBits.ViewChannel],
  async run(client, interaction) {
    const l = interaction.user.id;
    const sub = interaction.options.getSubcommand();

    if (sub === 'setup') {
      const channel = interaction.options.getChannel('channel');
      const me = interaction.guild.members.me;
      if (!channel.permissionsFor(me).has(PermissionFlagsBits.ManageWebhooks)) {
        return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, `البوت يحتاج صلاحية ادارة الويبهوك في ${channel}`, `The bot needs Manage Webhooks permission in ${channel}`))], ephemeral: true });
      }
      try {
        const name = interaction.member.displayName;
        const avatar = interaction.user.displayAvatarURL({ size: 512, extension: 'png' });
        const hook = await channel.createWebhook({ name, avatar });
        db.guilds.set(interaction.guild.id, 'webhook', { id: hook.id, token: hook.token, name, avatar, channelId: channel.id, byBot: true });
        return interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '✅ تم الحفظ', '✅ Saved'), L(l, `تم انشاء الويبهوك **${name}** في ${channel} وحفظه\nالان جاهز — استخدم \`/webhook send\` لارسال الرسائل`, `Webhook **${name}** created in ${channel} and saved\nNow use \`/webhook send\` to send messages`))] });
      } catch (e) {
        return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, `فشل انشاء الويبهوك: ${e.message}`, `Failed to create webhook: ${e.message}`))], ephemeral: true });
      }
    }

    if (sub === 'seturl') {
      const url = interaction.options.getString('url');
      const parsed = parseWebhookUrl(url);
      if (!parsed) {
        return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'رابط الويبهوك غير صالح — انسخه من اعدادات الروم > تكاملات > ويبهوك', 'Invalid webhook URL — copy it from Channel settings > Integrations > Webhooks'))], ephemeral: true });
      }
      const hook = new WebhookClient({ url: `https://discord.com/api/webhooks/${parsed.id}/${parsed.token}` });
      try {
        const info = await hook.fetch();
        db.guilds.set(interaction.guild.id, 'webhook', { id: parsed.id, token: parsed.token, name: info.name, avatar: info.avatarURL({ size: 512 }), channelId: info.channelId, byBot: false });
        return interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '✅ تم الحفظ', '✅ Saved'), L(l, `تم حفظ الويبهوك **${info.name}**\nالان جاهز — استخدم \`/webhook send\` لارسال الرسائل`, `Webhook **${info.name}** saved\nNow use \`/webhook send\` to send messages`))] });
      } catch (e) {
        return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, `لا يمكن الاتصال بهذا الويبهوك: ${e.message}`, `Cannot connect to that webhook: ${e.message}`))], ephemeral: true });
      }
    }

    if (sub === 'send') {
      const message = interaction.options.getString('message');
      const withBy = interaction.options.getBoolean('by') ?? true;
      const saved = getSaved(interaction.guild.id);
      if (!saved) {
        return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'لا يوجد ويبهوك محفوظ — استخدم `/webhook setup` اولاً', 'No saved webhook — use `/webhook setup` first'))], ephemeral: true });
      }
      try {
        const hook = clientFrom(saved);
        const content = withBy ? `${message}\n\n— <@${interaction.user.id}>` : message;
        await hook.send({
          content,
          username: interaction.member?.displayName || interaction.user.username,
          avatarURL: interaction.user.displayAvatarURL({ size: 512, extension: 'png' }),
        });
        return interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '✅ تم الارسال', '✅ Sent'), L(l, 'تم ارسال الرسالة عبر الويبهوك بنجاح', 'Message sent through the webhook successfully'))], ephemeral: true });
      } catch (e) {
        return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, `فشل الارسال عبر الويبهوك: ${e.message}`, `Failed to send through the webhook: ${e.message}`))], ephemeral: true });
      }
    }

    if (sub === 'info') {
      const saved = getSaved(interaction.guild.id);
      if (!saved) {
        return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'لا يوجد ويبهوك محفوظ — استخدم `/webhook setup` اولاً', 'No saved webhook — use `/webhook setup` first'))], ephemeral: true });
      }
      const ch = interaction.guild.channels.cache.get(saved.channelId);
      const fields = [
        { name: '📛 الاسم', value: saved.name || '—', inline: true },
        { name: '🆔 ID', value: saved.id, inline: true },
        { name: L(l, '🏷️ الروم', '🏷️ Channel'), value: ch ? ch.toString() : (saved.channelId || L(l, 'روم محذوف', 'Deleted channel')), inline: true },
        { name: L(l, '🚀 طريقة الارسال', '🚀 Sending'), value: L(l, 'اكتب `/webhook send message:رسالتك`', 'Type `/webhook send message:your text`'), inline: false },
      ];
      return interaction.reply({ embeds: [embed(interaction.guild, { title: L(l, '🔗 الويبهوك المحفوظ', '🔗 Saved webhook'), fields })] });
    }

    if (sub === 'remove') {
      const saved = getSaved(interaction.guild.id);
      if (!saved) {
        return interaction.reply({ embeds: [errorEmbed(interaction.guild, '❌', L(l, 'لا يوجد ويبهوك محفوظ', 'No saved webhook'))], ephemeral: true });
      }
      try {
        await clientFrom(saved).delete().catch(() => null);
      } catch {}
      db.guilds.delete(interaction.guild.id, 'webhook');
      return interaction.reply({ embeds: [successEmbed(interaction.guild, L(l, '✅ تم الحذف', '✅ Removed'), L(l, 'تم حذف الويبهوك المحفوظ', 'Saved webhook removed'))] });
    }
  },
};
