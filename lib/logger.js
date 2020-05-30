const chalk = require('chalk');

module.exports = {
  chalk() {
    return chalk;
  },

  prefix(char = '*') {
    return chalk.bold.cyan(`[${char}]`);
  },

  log(msg, pre = this.prefix('i')) {
    console.log(`${pre} ${msg}`);
  },

  success(msg, pre = this.prefix()) {
    console.log(`${pre} ${chalk.green(msg)}`);
  },

  error(msg, pre = this.prefix('!')) {
    console.log(`${pre} ${chalk.bold.red(msg)}`);
  },
};
