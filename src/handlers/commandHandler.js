const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const COMMANDS_DIR = path.join(__dirname, '..', 'commands');

const commands = new Map();

function loadCommandFiles() {
  commands.clear();
  const categories = fs.readdirSync(COMMANDS_DIR, { withFileTypes: true });
  let total = 0;
  for (const cat of categories) {
    if (!cat.isDirectory()) continue;
    const catPath = path.join(COMMANDS_DIR, cat.name);
    const files = fs.readdirSync(catPath).filter((f) => f.endsWith('.js'));
    for (const file of files) {
      const filePath = path.join(catPath, file);
      delete require.cache[require.resolve(filePath)];
      let cmd;
      try {
        cmd = require(filePath);
      } catch (e) {
        logger.error(`فشل تحميل امر ${cat.name}/${file}:`, e.message);
        continue;
      }
      if (!cmd || !cmd.data || !cmd.data.name) {
        const hasHandlers = cmd && Object.keys(cmd).some((k) => k.startsWith('handle'));
        if (!hasHandlers) logger.warn(`تخطي ملف بدون data: ${cat.name}/${file}`);
        continue;
      }
      if (commands.has(cmd.data.name)) {
        const existing = commands.get(cmd.data.name);
        logger.error(`أمر مكرر ممنوع: /${cmd.data.name} موجود في ${existing.filePath} و ${filePath} — تم تجاهل الملف الثاني. اعد تسمية احدها`);
        continue;
      }
      cmd.category = cmd.category || cat.name;
      cmd.filePath = filePath;
      commands.set(cmd.data.name, cmd);
      total++;
    }
  }
  logger.success(`تم تحميل ${total} امر`);
  return [...commands.values()];
}

function getCommand(name) {
  return commands.get(name);
}

function reloadCommands() {
  return loadCommandFiles();
}

module.exports = { loadCommandFiles, getCommand, reloadCommands, commands };
