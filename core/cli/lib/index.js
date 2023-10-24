'use strict';

module.exports = core;

const pkg = require('../package.json');
const log = require('@immoc-cli-dev-zed/log');
const utils = require('@immoc-cli-dev-zed/utils');

function core() {
    checkVersion()
}

function checkVersion() {
    log.notice('cli', pkg.version);
}
