'use strict';

const path = require('path');
const pkg = require('../package.json');
const log = require('@immoc-cli-dev-zed/log');
const semver = require('semver');
const colors = require('colors');
const rootCheck = require('root-check');
const userHome = require('user-home');
const pathExists = require('path-exists').sync;

const constant = require('./constant');

let args;

async function core() {
    try {
        checkVersion();
        checkNodeVersion();
        checkRoot();
        checkUserHome();
        checkInputArgs();
        checkEnv();
        await checkGlobalUpdate();
    } catch (e) {
        log.error(e.message);
    }
}

function checkVersion() {
    log.notice('cli', pkg.version);
}

function checkNodeVersion() {
    const currentVersion = process.version;
    const lowestVersion = constant.LOWEST_NODE_VERSION;
    if (!semver.gte(currentVersion, lowestVersion)) {
        throw new Error(colors.red(`immoc-cli-dev-zed 需要安装 v${lowestVersion} 以上版本的 Node`));
    }
}

function checkRoot() {
    rootCheck();
}

function checkUserHome() {
    if (!userHome || !pathExists(userHome)) {
        throw new Error(colors.red('当前登录用户主目录不存在!'));
    }
}

function checkInputArgs() {
    const minimist = require('minimist');
    args = minimist(process.argv.slice(2));
    checkArgs();
}

function checkArgs() {
    if (args.debug) {
        process.env.LOG_LEVEL = 'verbose';
    } else {
        process.env.LOG_LEVEL = 'info';
    }
    log.level = process.env.LOG_LEVEL;
}

function checkEnv() {
    const dotenv = require('dotenv');
    const dotenvPath = path.resolve(userHome, '.env');
    if (pathExists(dotenvPath)) {
        dotenv.config({
            path: dotenvPath
        })
    }
    createDefaultConfig();
}

function createDefaultConfig() {
    const cliConfig = {
        home: userHome
    }
    if (process.env.CLI_HOME) {
        cliConfig['cliHome'] = path.join(userHome, process.env.CLI_HOME);
    } else {
        cliConfig['cliHome'] = path.join(userHome, constant.DEFAULT_CLI_HOME);
    }
    process.env.CLI_HOME_PATH = cliConfig.cliHome;
}

async function checkGlobalUpdate() {
    //1、获取当前版本号和模块名
    const currentVersion = pkg.version;
    const npmName = pkg.name;
    //2、调用npm API，获取所有版本号
    const { getNpmInfo } = require('@immoc-cli-dev-zed/get-npm-info');
    const data = await getNpmInfo(npmName);
    console.log(data)
    //3、提取所有版本号，比对哪些版本号是大于当前版本号
    //4、获取最新的版本号，提示用户更新到该版本
}

module.exports = core;