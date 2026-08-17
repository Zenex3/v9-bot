const chalk = {
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  blue: (s) => `\x1b[34m${s}\x1b[0m`,
  magenta: (s) => `\x1b[35m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
  gray: (s) => `\x1b[90m${s}\x1b[0m`,
};

function now() {
  return new Date().toLocaleTimeString('en-GB');
}

module.exports = {
  info: (...args) => console.log(`${chalk.gray(now())} ${chalk.cyan('[INFO]')}`, ...args),
  success: (...args) => console.log(`${chalk.gray(now())} ${chalk.green('[OK]')}`, ...args),
  warn: (...args) => console.log(`${chalk.gray(now())} ${chalk.yellow('[WARN]')}`, ...args),
  error: (...args) => console.log(`${chalk.gray(now())} ${chalk.red('[ERROR]')}`, ...args),
  cmd: (...args) => console.log(`${chalk.gray(now())} ${chalk.magenta('[CMD]')}`, ...args),
  evt: (...args) => console.log(`${chalk.gray(now())} ${chalk.blue('[EVENT]')}`, ...args),
};
