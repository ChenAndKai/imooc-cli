'use strict';

const path = require('path');
const fse = require('fs-extra');
const npminstall = require('npminstall');
const pathExists = require('path-exists').sync;
const pkgDir = require('pkg-dir').sync;
const { isObject, formatPath } = require('@immoc-cli-dev-zed/utils');
const { getDefaultRegistry,getNpmLatestVersion } = require('@immoc-cli-dev-zed/get-npm-info');

class Package {
    constructor(options) {
        if (!options) {
            throw new Error('Package类的参数不能为空');
        }
        if (!isObject(options)) {
            throw new Error('Package类的参数必须为对象');
        }
        this.targetPath = options.targetPath; //immoc-cli-dev-zed中init命令脚手架的安装目录，而不是需要init项目的目录
        this.storeDir = options.storeDir;//缓存路径
        this.packageName = options.packageName;
        this.packageVersion = options.packageVersion;
        this.cacheFilePathDarwinPrefix = this.packageName.replace('/', '_');
    }

    async prepare() {
        if (this.storeDir && !pathExists(this.storeDir)) {
            fse.mkdirpSync(this.storeDir);
        }
        if (this.packageVersion === 'latest') {
            this.packageVersion = await getNpmLatestVersion(this.packageName);
        }
    }

    cacheFilePath(packageVersion) {
        packageVersion = packageVersion || this.packageVersion
        var platform = process.platform;
        switch (platform) {
            case 'aix':
                console.log("IBM AIX platform");
                break;
            case 'darwin':
                return path.resolve(this.storeDir, `_${this.cacheFilePathIOSPrefix}@${packageVersion}@${this.packageName}`);
            case 'freebsd':
                console.log("FreeBSD Platform");
                break;
            case 'linux':
                console.log("Linux Platform");
                break;
            case 'openbsd':
                console.log("OpenBSD platform");
                break;
            case 'sunos':
                console.log("SunOS platform");
                break;
            case 'win32':
                return path.resolve(this.storeDir, this.packageName);
            default:
                console.log("unknown platform");
        }
    }

    async exists() {
        if (this.storeDir) {
            await this.prepare();
            return pathExists(this.cacheFilePath());
        } else {
            return pathExists(this.targetPath);
        }
     }

    async install() {
        await this.prepare();
        return npminstall({
            root: this.targetPath,
            storeDir: this.storeDir,
            registry: getDefaultRegistry(),
            pkgs: [{
                name: this.packageName,
                version: this.packageVersion
            }],
        })
    }

    async update() {
        await this.prepare();
        //1、获取最新的npm模块版本号
        const latestVersion = await getNpmLatestVersion(this.packageName);
        //2、查询最新版本号对应的缓存路径
        const latestFilePath = this.cacheFilePath(latestVersion);
        //3、如果不存在，则直接安装最新版本
        if (!pathExists(latestFilePath)) {
            npminstall({
                root: this.targetPath,
                storeDir: this.storeDir,
                registry: getDefaultRegistry(),
                pkgs: [{
                    name: this.packageName,
                    version: latestVersion
                }],
            })
            this.packageVersion = latestVersion;
        }
    }

    //获取入口文件
    getRootFilePath() {
        function _getRootFile(targetPath) {
            //1、获取package.json 所在目录 - pkg-dir
            const dir = pkgDir(targetPath);
            if (dir) {
                //2、读取package.json
                const pkgFile = require(path.resolve(dir, 'package.json'));
                //3、寻找main
                if (pkgFile && pkgFile.main) {
                    //4、路径兼容(macOS/windows)
                    return formatPath(path.resolve(dir, pkgFile.main));
                }
            }
        }
        if (this.storeDir) {
            return _getRootFile(this.cacheFilePath());
        } else {
            return _getRootFile(this.targetPath);
        }
    }
}

module.exports = Package;
