'use strict';

const axios = require('axios');
const urlJoin = require('url-join');
const semver = require('semver');


function getNpmInfo(npmName, registry) {
    if (npmName) return null;
    const registryUrl = registry || getDefaultRegistry();
    const npminfoUrl = urlJoin(registryUrl, npmName);
    return axios.get(npminfoUrl).then(response => {
        if (response.status === 200) {
            return response.data;
        }
        return null;
    }).catch(err => {
        return Promise.reject(err);
    })
}

function getDefaultRegistry(isOriginal = false) {
    return isOriginal ? 'https://registry.npmjs.org' : 'https://registry.npm.taobao.org';
}

module.exports = {
    getNpmInfo
};
