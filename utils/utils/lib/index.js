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

module.exports = {
    sleep,
    isObject,
    formatPath,
    spinnerStart
};

