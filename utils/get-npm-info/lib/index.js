'use strict';

const axios = require('axios');
const urlJoin = require('url-join');
const semver = require('semver');


function getNpmInfo(npmName, registry) {
    if (!npmName) return null;
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

async function getNpmVersions(npmName, registry) {
    const data = await getNpmInfo(npmName, registry);
    if (data) {
        return Object.keys(data.versions);
    } else {
        return [];
    }
}

function getNpmSemverVersions(baseVersion, versions) {
    return versions
        .filter(version => semver.satisfies(version, `^${baseVersion}`))
        .sort((a, b) => semver.gt(b, a) ? 1 : -1);
}

async function getNpmLatestVersion(npmName, registry) {
    let versions = await getNpmVersions(npmName, registry);
    if (versions) {
        return versions.sort((a, b) => semver.gt(b, a) ? 1 : -1)[0];
    } 
    return null
}

async function getNpmSemverVersion(baseVersion, npmName, registry) {
    const versions = await getNpmVersions(npmName, registry);
    const newVersion = getNpmSemverVersions(baseVersion, versions);
    if (newVersion && newVersion.length > 0) {
        return newVersion[0];
    }
    return null
}

module.exports = {
    getNpmInfo,
    getNpmVersions,
    getDefaultRegistry,
    getNpmSemverVersion,
    getNpmLatestVersion
};
