'use strict';

const Package = require('@immoc-cli-dev-zed/package');
const log = require('@immoc-cli-dev-zed/log');
const path = require('path');

const SETTINGS = {
    init: '@immoc-cli-dev-zed/init'
}

const CACHE_PATH = 'dependencies';

async function exec() {
    let targetPath = process.env.CLI_TARGET_PATH;
    let storeDir = '';
    let pkg;
    const homePath = process.env.CLI_HOME_PATH;
    log.verbose('targetPath', targetPath);
    log.verbose('homePath', homePath);

    const cmdObj = arguments[arguments.length - 1];
    const cmdName = cmdObj.name();
    const packageName = SETTINGS[cmdName];
    const packageVersion = 'latest';

    if (!targetPath) {
        //用户在输入命令的时候主动提供--targetPath/-tp
        targetPath = path.resolve(homePath, CACHE_PATH); //生成缓存路径
        storeDir = path.resolve(targetPath, 'node_modules');

        pkg = new Package({
            targetPath,
            storeDir,
            packageName,
            packageVersion
        })

        if (await pkg.exists()) {
            //更新package
            await pkg.update();
        } else {
            //安装package
           await pkg.install();
        }
    } else {
        pkg = new Package({
            targetPath,
            packageName,
            packageVersion
        })
    }    
    //安装package之后，获取rootFile(package.json中的配置，main对应的入口文件)并执行
    //  xx/immoc-cli-dev-zed/commands/init/lib/index.js
    const rootFile = pkg.getRootFilePath(); 
    if (rootFile) {
        try {
            require(rootFile).call(null, Array.from(arguments));
        } catch (error) {
            log.error(error.message);   
        }
    }
    
}

module.exports = exec;