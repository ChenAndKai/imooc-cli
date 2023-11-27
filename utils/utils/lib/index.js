'use strict';

const path = require('path');


function isObject(o) {
    return Object.prototype.toString.call(o) === '[object Object]';
}

function formatPath(p) {
    if (p && typeof p === 'string') {
        //分隔符
        const sep = path.sep;
        if (sep !== '/') {
           return p.replace(/\\/g, '/');
        }
        return p;
    }
    return p;
}

function spinnerStart(msg, spinnerString = '|/-\\') {
    const Spinner = require('cli-spinner').Spinner;
    const spinner = new Spinner(msg + ' %s');
    spinner.setSpinnerString(spinnerString);
    spinner.start();
    return spinner;
}

function sleep(timeout = 1000) {
    return new Promise(resolve => setTimeout(resolve, timeout));
}

function exec(command, args, options) {
    const win32 = process.platform === 'win32';

    const cmd = win32 ? 'cmd' : command;
    const cmdArgs = win32 ? ['/c'].concat(command, args) : args;
    return require('child_process').spawn(cmd, cmdArgs, options || {});
}

module.exports = {
    exec,
    sleep,
    isObject,
    formatPath,
    spinnerStart
};

