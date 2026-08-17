const { db, userKey } = require('./database');

const LANG_AR = 'ar';
const LANG_EN = 'en';

const strings = {
  ar: require('../strings/ar'),
  en: require('../strings/en'),
};

function getLang(userId) {
  if (!userId) return 'ar';
  const u = db.users.get(userKey(userId));
  return u?.lang || 'ar';
}

function setLang(userId, lang) {
  const u = db.users.ensure(userKey(userId), {});
  u.lang = lang;
  db.users.set(userKey(userId), u);
  return u.lang;
}

function t(userId, key, ...args) {
  const lang = getLang(userId);
  let str = strings[lang]?.[key] ?? strings.ar[key] ?? key;
  if (args.length) {
    args.forEach((a, i) => { str = str.replaceAll(`{${i}}`, String(a)); });
  }
  return str;
}

function L(userId, ar, en) {
  return getLang(userId) === LANG_EN ? en : ar;
}

module.exports = { strings, getLang, setLang, t, L, LANG_AR, LANG_EN };
