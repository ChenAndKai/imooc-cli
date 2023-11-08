'use strict';

const Package = require('@immoc-cli-dev-zed/package');
const log = require('@immoc-cli-dev-zed/log');
const path = require('path');
const cp = require('child_process');

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
            //在当前进程中调用
            // require(rootFile).call(null, Array.from(arguments));
            //在node子进程调用
            const args = Array.from(arguments);
            const cmd = args[args.length - 1];
            const obj = Object.create(null);
            Object.keys(cmd).forEach(key => {
                
                if (cmd.hasOwnProperty(key) &&
                    !key.startsWith('_') &&
                    key !== 'parent') {
                    obj[key] = cmd[key];
                    }
            })

            args[args.length - 1] = obj;
            const code = `require('${rootFile}').call(null, ${JSON.stringify(args)})`;
            const child = spawn('node', ['-e', code], {
                cwd: process.cwd(),
                stdio: 'inherit'
            });
            child.on('error', e => {
                log.error(e.message);
                process.exit(1);
            })
            child.on('exit', e => {
                log.verbose('命令执行成功: ' + e);
                process.exit(e);
            })
        } catch (error) {
            log.error(error.message);   
        }
    } 
}

function spawn(command, args, options) {
    const win32 = process.platform === 'win32';

    const cmd = win32 ? 'cmd' : command;
    const cmdArgs = win32 ? ['/c'].concat(command, args) : args;
    return cp.spawn(cmd, cmdArgs, options || {});
}

module.exports = exec;