'use strict';

const Package = require('@immoc-cli-dev-zed/package');
const log = require('@immoc-cli-dev-zed/log');

function exec() {
    const targetPath = process.env.CLI_TARGET_PATH;
    const homePath = process.env.CLI_HOME_PATH;
    log.verbose('targetPath', targetPath);
    log.verbose('homePath', homePath);
    const pkg = new Package()
    console.log(pkg);
}

module.exports = exec;