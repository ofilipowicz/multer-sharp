import chalk from 'chalk/source';

export default (info) => {
  /* eslint-disable no-console */
  console.info(chalk.green(`
    Image format is ${info.format},
    Image height is ${info.height},
    & Image width is ${info.width}
  `));
  console.info(chalk.magenta(JSON.stringify(info)));
};
