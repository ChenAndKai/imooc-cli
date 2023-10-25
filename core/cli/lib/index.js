'use strict';

const pkg = require('../package.json');
const log = require('@immoc-cli-dev-zed/log');
const semver = require('semver');
const colors = require('colors');
const rootCheck = require('root-check');
const userHome = require('user-home');
const pathExists = require('path-exists').sync;

const constant = require('./constant');

function core() {
    try {
        checkVersion();
        checkNodeVersion();
        checkRoot();
        checkUserHome();
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

module.exports = core;