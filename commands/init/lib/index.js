'use strict';

const Command = require('@immoc-cli-dev-zed/command');
const log = require('@immoc-cli-dev-zed/log');
class InitCommand extends Command {
    init() {
        this.projectName = this._argv[0] || '';
        this.force = this._cmd.opts().force;
        log.verbose('projectName', this.projectName);
        log.verbose('force', this.force);
    }

    exec() {
        console.log('exec');
    }
}

function init(argv) {
    return new InitCommand(argv);
}


module.exports = init;
module.exports.InitCommand = InitCommand;