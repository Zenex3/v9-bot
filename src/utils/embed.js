const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const config = require('../../config.json');

const COLORS = {
  red: parseInt(config.color.replace('#', ''), 16) || 0xE60000,
  darkRed: parseInt(config.colorDark.replace('#', ''), 16) || 0x8B0000,
  success: 0x22c55e,
  error: 0xdc2626,
  warning: 0xf59e0b,
  info: 0x3b82f6,
  green: 0x22c55e,
  orange: 0xf97316,
  blue: 0x3b82f6,
  purple: 0x8b5cf6,
  pink: 0xec4899,
  yellow: 0xfacc15,
  cyan: 0x06b6d4,
  white: 0xffffff,
  black: 0x000000,
};

function baseEmbed(guild) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.red)
    .setTimestamp();
  if (guild) {
    const icon = guild.iconURL({ size: 256 });
    embed.setFooter({ text: guild.name, iconURL: icon });
    if (icon && !embed.data.thumbnail) embed.setThumbnail(icon);
  } else {
    embed.setFooter({ text: 'V9 Bot' });
  }
  return embed;
}

function embed(guild, options = {}) {
  const e = baseEmbed(guild);
  if (options.title) e.setTitle(options.title);
  if (options.description) e.setDescription(options.description);
  if (options.fields) e.addFields(options.fields);
  if (options.thumbnail) { try { e.setThumbnail(options.thumbnail); } catch {} }
  if (options.image) { try { e.setImage(options.image); } catch {} }
  if (options.author && options.author.name) {
    e.setAuthor({ name: options.author.name, iconURL: options.author.iconURL, url: options.author.url });
  }
  if (options.footer) e.setFooter({ text: options.footer.text, iconURL: options.footer.iconURL });
  if (options.color) e.setColor(COLORS[options.color] ?? options.color);
  if (options.url) e.setURL(options.url);
  return e;
}

function successEmbed(guild, title, description) {
  return embed(guild, { title, description, color: 'success' });
}

function errorEmbed(guild, title, description) {
  return embed(guild, { title, description, color: 'error' });
}

function warnEmbed(guild, title, description) {
  return embed(guild, { title, description, color: 'warning' });
}

function dangerButton(label, customId, style = ButtonStyle.Danger) {
  return new ButtonBuilder().setLabel(label).setCustomId(customId).setStyle(style);
}

function row(...components) {
  return new ActionRowBuilder().addComponents(components);
}

module.exports = { COLORS, baseEmbed, embed, successEmbed, errorEmbed, warnEmbed, row, dangerButton, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder };
