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

module.exports = {
    isObject,
    formatPath
};

