/**
 * مسح كل الاوامر (سلاش) الخاصة باي بوت
 *
 * الاستخدام:
 *   node tools/clearCommands.js <TOKEN> [CLIENT_ID]
 *
 * هيحذف:
 *   - كل الاوامر العامة (Global)
 *   - كل الاوامر في كل السيرفرات اللي البوت فيها
 *
 * ملحوظة: محتاج توكن البوت نفسه. لو مش معاك التوكن فالحل الوحيد
 * هو طرد البوت من السيرفر (هيمسح اوامره جوه السيرفر تلقائيا) ثم
 * اعادة اضافته لو عايزه يفضل موجود.
 */
const { REST, Routes } = require('discord.js');

async function main() {
  const token = process.argv[2];
  const clientId = process.argv[3];

  if (!token) {
    console.error('نقص التوكن\nالاستخدام: node tools/clearCommands.js <TOKEN> [CLIENT_ID]');
    process.exit(1);
  }

  const rest = new REST({ version: '10' }).setToken(token);

  // نجيب clientId لو مش متحدد
  let id = clientId;
  if (!id) {
    try {
      const me = await rest.get(Routes.user('@me'));
      id = me.id;
    } catch (e) {
      console.error('مش عارف اجيب clientId:', e.message);
      process.exit(1);
    }
  }

  // 1) مسح الاوامر العامة
  try {
    await rest.put(Routes.applicationCommands(id), { body: [] });
    console.log(`✔ تم مسح كل الاوامر العامة (Global)`);
  } catch (e) {
    console.error('فشل مسح الاوامر العامة:', e.message);
  }

  // 2) مسح اوامر كل سيرفر
  try {
    const guilds = await rest.get(Routes.userGuilds());
    for (const g of guilds) {
      try {
        await rest.put(Routes.applicationGuildCommands(id, g.id), { body: [] });
        console.log(`✔ تم مسح اوامر سيرفر: ${g.name}`);
      } catch (e) {
        console.error(`فشل مسح اوامر سيرفر ${g.name}:`, e.message);
      }
    }
    console.log('✅ انتهى المسح الكامل');
  } catch (e) {
    console.error('فشل جلب قائمة السيرفرات:', e.message);
  }
}

main();
