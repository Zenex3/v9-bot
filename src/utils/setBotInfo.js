const config = require('../../config.json');

const NAME = 'V9 Bot';
const DESCRIPTION = '⚡ V9 Bot — البوت الرسمي لسيرفر V9 ⚡\n\nحماية متقدمة (Anti-Nuke / Anti-Raid / Anti-Spam / Anti-Alt / Anti-Invite)، نظام مستويات وتجارب، تحذيرات وعقوبات ذكية، رولات تلقائية، ترحيب وتوديع مخصص، شارات، اقتصاد، تذاكر، جوائز، جدولة رسائل، رياكشن رولز، وأوامر إدارة متكاملة بتحكم كامل.\n\nمُطوَّر ومُدار بالكامل بواسطة صاحب سيرفر V9.';

async function main() {
  const res = await fetch('https://discord.com/api/v10/applications/@me', {
    method: 'PATCH',
    headers: {
      Authorization: `Bot ${config.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: NAME,
      description: DESCRIPTION,
    }),
  });
  const data = await res.json();
  console.log('HTTP', res.status);
  console.log(JSON.stringify(data, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
