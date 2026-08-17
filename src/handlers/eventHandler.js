const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const EVENTS_DIR = path.join(__dirname, '..', 'events');

function loadEvents(client) {
  const files = fs.readdirSync(EVENTS_DIR).filter((f) => f.endsWith('.js'));
  let total = 0;
  for (const file of files) {
    try {
      const event = require(path.join(EVENTS_DIR, file));
      if (!event || !event.name) continue;
      const bind = event.once ? 'once' : 'on';
      client[bind](event.name, (...args) => {
        try {
          const res = event.run(client, ...args);
          if (res && typeof res.catch === 'function') {
            res.catch((e) => logger.error(`خطا في حدث ${event.name}:`, e));
          }
        } catch (e) {
          logger.error(`خطا في حدث ${event.name}:`, e);
        }
      });
      total++;
    } catch (e) {
      logger.error(`فشل تحميل حدث ${file}:`, e.message);
    }
  }
  logger.success(`تم تحميل ${total} حدث`);
}

module.exports = { loadEvents };
