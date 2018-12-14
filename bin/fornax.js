#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const program = require('commander');
const inquirer = require('inquirer');
const start = require('../commands/start');
const colors = require('colors');
const JSON5 = require('json5');

const cwd = process.cwd();
const configFileName = '.fornax.config.js';
const configFile = `${cwd}/${configFileName}`;

let config;
const defaultConfig = {
  port: 9000,
  apiPrefix: '/api',
  mockRoot: 'mock',
  responseInterceptor: function(body) {
    const { responseKey } = config;
    return {
      [responseKey.code]: 200,
      [responseKey.message]: 'success',
      [responseKey.data]: body,
    };
  },
  sessionConfig: {
    key: 'koa:sess',
    maxAge: 60 * 60 * 1000,
  },
  responseKey: {
    code: 'code',
    message: 'msg',
    data: 'data',
  },
  pageKey: {
    skip: 'skip',
    limit: 'limit',
    order: 'order',
    orderBy: 'orderBy',
    pageSize: 'pageSize',
    currentPage: 'currentPage',
  },
};

config = { ...defaultConfig };
if (fs.existsSync(configFile)) {
  const {
    responseKey: uResponseKey,
    pageKey: uPageKey,
    sessionConfig: uSessionConfig,
    ...uOthers
  } = require(configFile);
  const {
    responseKey: dResponseKey,
    pageKey: dPageKey,
    sessionConfig: dSessionConfig,
    ...dOthers
  } = defaultConfig;

  config = {
    ...dOthers,
    ...uOthers,
    sessionConfig: { ...dSessionConfig, ...uSessionConfig },
    responseKey: { ...dResponseKey, ...uResponseKey },
    pageKey: { ...dPageKey, ...uPageKey },
  };
}

program
  .command('start')
  .description('start mock server')
  .action(function() {
    start.start(config);
  });
program
  .command('init')
  .description('initialize project with .fornax.config.js')
  .action(function() {
    inquirer
      .prompt([
        {
          type: 'input',
          name: 'port',
          message: 'mock server port?',
          default: 9000,
        },
        {
          type: 'input',
          name: 'apiPrefix',
          message: 'prefix of mock server api?',
          default: '/api',
        },
        {
          type: 'input',
          name: 'mockRoot',
          message: 'directory of mock files?',
          default: 'mock',
        },
      ])
      .then(function(answers) {
        answers.port = +answers.port;
        fs.writeFileSync(
          path.join(process.cwd(), `./${configFileName}`),
          `module.exports = ${JSON5.stringify(answers, null, 2)}`,
          { encoding: 'utf8' },
        );
        console.log(
          colors.green('create '),
          colors.yellow(`${configFileName}`),
        );
        console.log(`run ${colors.cyan('fornax start')} to begin`);
      });
  });

program.parse(process.argv);
