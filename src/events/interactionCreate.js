const { InteractionType } = require('discord.js');
const logger = require('../utils/logger');
const { embed } = require('../utils/embed');
const { isOwner } = require('../utils/functions');
const { t } = require('../utils/i18n');
const { db } = require('../utils/database');
const componentHandler = require('../handlers/componentHandler');

const handlers = {
  [InteractionType.ApplicationCommand]: handleCommand,
  [InteractionType.MessageComponent]: handleComponent,
  [InteractionType.ModalSubmit]: handleModal,
};

module.exports = {
  name: 'interactionCreate',
  async run(client, interaction) {
    const handler = handlers[interaction.type];
    if (handler) {
      try {
        await handler(client, interaction);
      } catch (e) {
        logger.error(`خطا في ${interaction.type}:`, e);
        const msg = t(interaction.user?.id, 'error_generic');
        if (interaction.deferred || interaction.replied) {
          interaction.followUp({ content: msg, ephemeral: true }).catch(() => {});
        } else {
          interaction.reply({ content: msg, ephemeral: true }).catch(() => {});
        }
      }
    }
  },
};

async function handleCommand(client, interaction) {
  const cmd = client.commands.get(interaction.commandName);
  if (!cmd) return;

  const l = interaction.user.id;
  const blacklist = db.bot.ensure('blacklist', { user: [], guild: [] });
  if (blacklist.user.some((b) => b.id === interaction.user.id) && !isOwner(interaction.user.id)) {
    return interaction.reply({ content: t(l, 'unknown_interaction'), ephemeral: true }).catch(() => {});
  }

  const maintenance = db.bot.get('maintenance');
  if (maintenance?.enabled && !isOwner(interaction.user.id)) {
    return interaction.reply({ content: '🛠️ ' + t(l, 'unknown_modal'), ephemeral: true }).catch(() => {});
  }

  if (cmd.devOnly && !isOwner(interaction.user.id)) {
    return interaction.reply({ embeds: [embed(interaction.guild, { title: t(l, 'no_permission'), description: t(l, 'error_generic'), color: 'error' })], ephemeral: true });
  }

  if (cmd.ownerOnly && interaction.user.id !== interaction.guild?.ownerId && !isOwner(interaction.user.id)) {
    return interaction.reply({ embeds: [embed(interaction.guild, { title: t(l, 'no_permission'), description: t(l, 'error_generic'), color: 'error' })], ephemeral: true });
  }

  const ownerCategories = ['owner', 'config', 'protection', 'shop', 'tickets'];
  if (ownerCategories.includes(cmd.category) && !isOwner(interaction.user.id)) {
    return interaction.reply({ embeds: [embed(interaction.guild, { title: t(l, 'no_permission'), description: t(l, 'error_generic'), color: 'error' })], ephemeral: true });
  }

  const required = cmd.permissions || [];
  for (const perm of required) {
    if (!interaction.memberPermissions?.has(perm)) {
      return interaction.reply({ embeds: [embed(interaction.guild, { title: t(l, 'no_permission'), description: t(l, 'no_permission_bot') + ': `' + perm + '`', color: 'error' })], ephemeral: true });
    }
  }

  const botRequired = cmd.botPermissions || [];
  if (botRequired.length && interaction.guild) {
    let botMember = interaction.guild.members.me;
    if (!botMember) {
      botMember = await interaction.guild.members.fetch(client.user.id).catch(() => null);
    }
    for (const perm of botRequired) {
      if (!botMember?.permissions.has(perm)) {
        return interaction.reply({ embeds: [embed(interaction.guild, { title: t(l, 'no_permission_bot'), description: t(l, 'no_permission_bot') + ': `' + perm + '`', color: 'warning' })], ephemeral: true });
      }
    }
  }

  if (interaction.isChatInputCommand?.() && interaction.guild) {
    const cooldown = cmd.cooldown || 2000;
    const key = `${interaction.user.id}.${interaction.commandName}`;
    const now = Date.now();
    const last = client.cooldowns.get(key);
    if (last && now - last < cooldown) {
      const remain = Math.ceil((cooldown - (now - last)) / 1000);
      return interaction.reply({ content: t(l, 'cooldown_wait', remain), ephemeral: true });
    }
    client.cooldowns.set(key, now);
  }

  logger.cmd(`${interaction.user.tag} -> /${interaction.commandName}`);
  await cmd.run(client, interaction);
}

async function handleComponent(client, interaction) {
  if (!interaction.isButton() && !interaction.isAnySelectMenu()) return;
  const handled = await componentHandler.handle(client, interaction);
  if (!handled) {
    await interaction.reply({ content: t(interaction.user.id, 'unknown_interaction'), ephemeral: true });
  }
}

async function handleModal(client, interaction) {
  const handled = await componentHandler.handle(client, interaction);
  if (!handled) {
    await interaction.reply({ content: t(interaction.user.id, 'unknown_modal'), ephemeral: true });
  }
}
