const config = require('../../config.json');
const { sync } = require('../services/commandSync');

if (require.main === module) {
  if (!config.token || config.token.startsWith('ضع')) {
    console.error('ضع التوكن في config.json اولا');
    process.exit(1);
  }
  sync({ force: true })
    .then((results) => {
      console.log('[REGISTER]', results.join(' | '));
      process.exit(0);
    })
    .catch((e) => {
      console.error('[REGISTER] فشل تسجيل الاوامر:', e.message);
      process.exit(1);
    });
}
