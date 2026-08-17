const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const COMMANDS_DIR = path.join(__dirname, '..', 'commands');

const exact = new Map();
const prefixes = [];

function walkDir(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkDir(full, out);
    else if (entry.name.endsWith('.js')) out.push(full);
  }
  return out;
}

// كل ملف أمر ممكن يصدّر `components` بصيغة:
//   components: {
//     'shop_back': fn,      // مطابقة تامة على customId
//     'shop_cat_*': fn,     // بادئة (أي customId يبدأ بـ shop_cat_)
//   }
// المفتاح اللي ينتهي بـ `*` يشتغل كبادئة، وأي حاجة تانية مطابقة تامة.
function loadComponents() {
  exact.clear();
  prefixes.length = 0;

  const files = walkDir(COMMANDS_DIR);
  let filesWithComps = 0;
  for (const filePath of files) {
    delete require.cache[require.resolve(filePath)];
    let mod;
    try {
      mod = require(filePath);
    } catch (e) {
      logger.error(`فشل تحميل تفاعلات ${path.relative(COMMANDS_DIR, filePath)}:`, e.message);
      continue;
    }
    const comps = mod && mod.components;
    if (!comps || typeof comps !== 'object') continue;

    for (const [key, fn] of Object.entries(comps)) {
      if (typeof fn !== 'function') {
        logger.warn(`قيمة components غير دالة: ${key} في ${path.relative(COMMANDS_DIR, filePath)}`);
        continue;
      }
      if (key.endsWith('*')) {
        const prefix = key.slice(0, -1);
        if (prefixes.some((p) => p.prefix === prefix)) {
          logger.error(`بادئة تفاعل مكررة: ${key} — تم تجاهل الاخيرة`);
          continue;
        }
        prefixes.push({ prefix, fn, file: filePath });
      } else {
        if (exact.has(key)) {
          logger.error(`customId مكرر: ${key} في ${exact.get(key).file} و ${filePath} — تم تجاهل الاخيرة`);
          continue;
        }
        exact.set(key, { fn, file: filePath });
      }
    }
    filesWithComps++;
  }
  logger.success(`تم تحميل ${exact.size} تفاعل ثابت و ${prefixes.length} بادئة تفاعل من ${filesWithComps} ملف`);
  return { exact: exact.size, prefixes: prefixes.length, files: filesWithComps };
}

// يرجّع true لو لقى معالج ركضه، و false لو التفاعل مش معروف
async function handle(client, interaction) {
  const id = interaction.customId;
  if (!id) return false;

  const entry = exact.get(id);
  if (entry) {
    await entry.fn(client, interaction);
    return true;
  }
  for (const p of prefixes) {
    if (id.startsWith(p.prefix)) {
      await p.fn(client, interaction);
      return true;
    }
  }
  return false;
}

// مرجع للفئات المغلقة (للاختبار والتصحيح فقط)
function registry() {
  return {
    exact: [...exact.keys()].sort(),
    prefixes: prefixes.map((p) => p.prefix + '*').sort(),
  };
}

module.exports = { loadComponents, handle, registry };
