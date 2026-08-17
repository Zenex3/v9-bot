const logger = require('../utils/logger');
const { db } = require('../utils/database');

module.exports = {
  name: 'guildDelete',
  async run(client, guild) {
    logger.warn(`تم ازالتي من سيرفر: ${guild.name}`);
    db.guilds.db.delete(guild.id);
    db.guilds.db.save();
  },
};
