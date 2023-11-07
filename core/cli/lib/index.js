'use strict';

const path = require('path');
const pkg = require('../package.json');
const semver = require('semver');
const colors = require('colors');
const rootCheck = require('root-check');
const userHome = require('user-home');
const commander = require('commander');
const pathExists = require('path-exists').sync;
const log = require('@immoc-cli-dev-zed/log');
const exec = require('@immoc-cli-dev-zed/exec');

const constant = require('./constant');
const program = new commander.Command();

/**
 * Commander库可实现类似功能
 * 通过program.on方法监听命令中输入的属性
    let args;
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
 */

async function core() {
    try {
        prepare();
        registerCommand();
    } catch (e) {
        log.error(e.message);
    }
}

async function prepare() {
    checkPkgVersion();
    checkRoot();
    checkUserHome();
    checkEnv();
    await checkGlobalUpdate();
}

function registerCommand() {
    program
        .name(Object.keys(pkg.bin)[0])
        .usage('<command> [options]')
        .version(pkg.version)
        .option('-d, --debug', '是否开启调试模式', false)
        .option('-tp, --targetPath <targetPath>', '是否指定本地调试文件路径', '');
    
    program
        .command('init [projectName]')
        .option('-f, --force', '是否强制初始化项目')
        .action(exec);
    
    //开启debug模式
    program.on('option:debug', function () {
        if (program.opts().debug) {
            process.env.LOG_LEVEL = 'verbose';
        } else {
            process.env.LOG_LEVEL = 'info';
        }
        log.level = process.env.LOG_LEVEL;
    })

    //指定targetPath
    program.on('option:targetPath', function () {
        process.env.CLI_TARGET_PATH = program.opts().targetPath;
    })

    //监听未知命令
    program.on('command:*', function (obj) {
        const availableCommands = program.commands.map(cmd => cmd.name);
        console.log(colors.red(`未知命令: ${obj[0]}`));
        if (availableCommands.length) {
            console.log(colors.red(`可用命令: ${availableCommands.join(',')}`));
        }
    })

    program.parse(process.argv);

    if (program.args && program.args.length < 1) {
        program.outputHelp();
    } 
}
    
function checkPkgVersion() {
    log.notice('cli', pkg.version);
}

function checkRoot() {
    rootCheck();
}

function checkUserHome() {
    if (!userHome || !pathExists(userHome)) {
        throw new Error(colors.red('当前登录用户主目录不存在!'));
    }
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
    //3、提取所有版本号，比对哪些版本号是大于当前版本号
    const { getNpmSemverVersion } = require('@immoc-cli-dev-zed/get-npm-info');
    const lastVersion = await getNpmSemverVersion(currentVersion, npmName);
    //4、获取最新的版本号，提示用户更新到该版本
    if (lastVersion && semver.gt(lastVersion, currentVersion)) {
        log.warn(colors.yellow(`请手动更新 ${npmName}, 当前版本: ${currentVersion}, 最新版本: ${lastVersion} 
           更新命令: npm install -g ${npmName}`));
    }
}

module.exports = core;