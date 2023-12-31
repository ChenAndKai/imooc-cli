'use strict';

const fs = require('fs');
const path = require('path');
const fse = require('fs-extra');
const inquirer = require('inquirer');
const userHome = require('user-home');
const Command = require('@immoc-cli-dev-zed/command');
const Package = require('@immoc-cli-dev-zed/package');
const { spinnerStart, sleep, execAsync } = require('@immoc-cli-dev-zed/utils');
const log = require('@immoc-cli-dev-zed/log');
const semver = require('semver');
const { globSync } = require('glob');
const ejs = require('ejs');

const getProjectTemplate = require('./getProjectTemplate');

const TYPE_PROJECT = 'project';
const TYPE_COMPONENT = 'component';

const TEMPLATE_TYPE_NORMAL = 'NORMAL';
const TEMPLATE_TYPE_CUSTOM = 'CUSTOM';

const WHITE_CMD = ['npm', 'cnpm'];

class InitCommand extends Command {
    init() {
        this.projectName = this._argv[0] || '';
        this.force = this._argv[1].force;
        log.verbose('projectName', this.projectName);
        log.verbose('force', this.force);
    }

    async exec() {
        try {
            //准备阶段
            const projectInfo = await this.prepare();
            if (projectInfo) {
                log.verbose('projectInfo', projectInfo);
                this.projectInfo = projectInfo;
                //下载模板
                await this.downloadTemplate();
                //安装模板
                await this.installTemplate();
            }
            
        } catch (error) {
            log.error(error.message)
            if (process.env.LOG_LEVEL === 'verbose') {
                console.log(error);
            }
        }
    }

    async installTemplate() {
        if (this.templateInfo) {
            if (!this.templateInfo.type) {
                this.templateInfo.type = TEMPLATE_TYPE_NORMAL;
            }
            if (this.templateInfo.type === TEMPLATE_TYPE_NORMAL) {
                //安装标准模板
                await this.installNormalTemplate();
            } else if (this.templateInfo.type === TEMPLATE_TYPE_CUSTOM) {
                //安装自定义模板
                await this.installCustomTemplate();
            } else {
                throw new Error('无法识别项目模板类别');
            }
        } else {
            throw new Error('模板信息不存在');
        }
    }

    checkCommand(cmd) {
        if (WHITE_CMD.includes(cmd)) {
            return cmd
        }
        return null
    }
    
    async execCommand(command, errorMessage) {
        let res;
        const cmdArray = command.split(' ');
        const cmd = this.checkCommand(cmdArray[0]);
        if (!cmd) {
            throw new Error(`命令${cmd}不存在!`);
        }
        const args = cmdArray.slice(1);
        res = await execAsync(cmd, args, {
            stdio: 'inherit',
            cwd: process.cwd()
        });
        if (res !== 0) {
            throw new Error(errorMessage);
        }
    }

    ejsRender(options) {
        const projectInfo = this.projectInfo;
        return new Promise((resolve, reject) => {
            const dir = process.cwd();
            const files = globSync('**', {
                cwd: dir,
                ignore: options.ignore,
                nodir: true
            })
            Promise.all(files.map(file => {
                const filePath = path.resolve(dir, file);
                const render = ejs.renderFile(filePath, projectInfo, {})
                return render.then(result => {
                    fse.writeFileSync(filePath, result);
                    return Promise.resolve(result)
                })
            })).then((res) => {
                resolve(res);
            }).catch(err => {
                reject(err);
            })
        })
    }

    async installNormalTemplate() {
        //拷贝模板代码至当前目录
        let spinner = spinnerStart('正在安装模板');
        try {
            const templatePath = path.resolve(this.templateNpm.cacheFilePath(), 'template');
            const targetPath = process.cwd();
            fse.ensureDirSync(templatePath);
            fse.ensureDirSync(targetPath);
            fse.copySync(templatePath, targetPath);
        } catch (error) {
            throw error;
        } finally {
            spinner.stop(true);
            log.success('模板安装成功')
        }
        const templateIgnore = this.templateInfo.ignore || [];
        const ignore = ['**/node_modules/**' ,...templateIgnore];
        await this.ejsRender({ignore});
        const { installCommand, startCommand } = this.templateInfo;
        //执行安装依赖命令
        await this.execCommand(installCommand, '依赖安装过程失败!');
        //执行启动项目命令
        await this.execCommand(startCommand, '项目执行过程失败!');
    }

    async installCustomTemplate() {
        //安装自定义模板
        // if(await this)
        if (await this.templateNpm.exists()) {
            const rootFile = this.templateNpm.getRootFilePath();
            if (fs.existsSync(rootFile)) {
                log.notice('开始执行自定义模板');
                const templatePath = path.resolve(this.templateNpm.cacheFilePath(), 'template');
                const options = {
                    templateInfo: this.templateInfo,
                    projectInfo: this.projectInfo,
                    sourcePath: templatePath,
                    targetPath: process.cwd()
                };
                const code = `require('${rootFile}')(${JSON.stringify(options)})`;
                log.verbose('code', code);
                await execAsync('node', ['-e', code], { stdio: 'inherit', cwd: process.cwd() });
                log.success('自定义模板安装成功');
            } else {
                throw new Error('自定义模板入口文件不存在');
            }
        }
    }

    async downloadTemplate() {
        //1、通过项目模板API获取项目模板信息
        //  1) 通过egg.js搭建一套后端系统
        //  2) 通过npm存储项目模板 (vue-cli/vue-element-admin)
        //  3) 将项目模板信息存储到mongodb数据库
        //  4) 通过egg.js获取mongodb中的数据并且通过API返回
        const { projectTemplate } = this.projectInfo;
        const templateInfo = this.template.find(item => item.npmName === projectTemplate);
        const { npmName, version } = templateInfo;
        const targetPath = path.resolve(userHome, '.immoc-cli-dev', 'template');
        const storeDir = path.resolve(userHome, '.immoc-cli-dev', 'template', 'node_modules');
        const templateNpm = new Package({
            targetPath,
            storeDir,
            packageName: npmName,
            packageVersion: version
        })
        this.templateInfo = templateInfo;
        if (!await templateNpm.exists()) {
            const spinner = spinnerStart('正在下载模板...');
            try {
                await templateNpm.install();
            } catch (error) {
                throw error
            } finally {
                spinner.stop(true);
                if (await templateNpm.exists()) {
                    log.success('下载模板成功');
                    this.templateNpm = templateNpm;
                }
            }
        } else {
            const spinner = spinnerStart('正在更新模板...');
            try {
                await templateNpm.update();
            } catch (error) {
                throw error
            } finally {
                spinner.stop(true);
                if (await templateNpm.exists()) {
                    log.success('更新模板成功');
                    this.templateNpm = templateNpm;
                }
            }
        }
    }

    async prepare() {
        //0、判断项目模板是否存在
        const template = await getProjectTemplate();
        if (!template || template.length === 0) {
            throw new Error('项目模板不存在');
        }
        this.template = template;
        //1、检查当前目录是否为空
        const localPath = process.cwd();
        if (!this.isDirEmpty(localPath)) {
            //询问是否继续创建
            let ifContinue = false;
            if (!this.force) {
                ifContinue = (await inquirer.prompt({
                    type: 'confirm',
                    name: 'ifContinue',
                    default: false,
                    message: '当前文件夹不为空，是否继续创建？'
                })).ifContinue;
                if (!ifContinue) {
                    return;
                }
            }
            //2、是否强制更新
            if (ifContinue || this.force) {
                const { confirmDelete } = await inquirer.prompt({
                    type: 'confirm',
                    name: 'confirmDelete',
                    default: false,
                    message: '是否确认清空当前目录文件？'
                })
                if (confirmDelete) {
                    //清空当前目录
                    const spinner = spinnerStart('正在清空目录...');
                    fse.emptyDirSync(localPath);
                    spinner.stop(true);
                }
            }
        }
        return this.getProjectInfo();
    }

    async getProjectInfo() {
        let projectInfo = {}
        //1、选择项目或组件
        const { type } = await inquirer.prompt({
            type: 'list',
            name: 'type',
            message: '请选择初始化类型',
            default: TYPE_PROJECT,
            choices: [{
                name: '项目',
                value: TYPE_PROJECT
            }, {
                name: '组件',
                value: TYPE_COMPONENT
            }]
        });
        this.template = this.template.filter(template => template.tag.includes(type));
        log.verbose('type', type);
        function ValidateName(v) {
            return /^[a-zA-Z]+([-][a-zA-Z][a-zA-Z0-9]*|[_][a-zA-Z][a-zA-Z0-9]*|[a-zA-Z0-9])*$/.test(v)
        }
        let isValidProjectName = false;
        if (ValidateName(this.projectName)) {
            isValidProjectName = true;
            projectInfo.projectName = this.projectName;
        }
        const title = type === TYPE_PROJECT ? '项目' : '组件';
        const projectPrompt = [];
        if (!isValidProjectName) {
            projectPrompt.push({
                type: 'input',
                name: 'projectName',
                message: `请输入${title}名称`,
                default: '',
                validate: function (v) {
                    const done = this.async();
                    //合法: a, a-b, a-b-c, a_b_c, a-b1-c1, a_b1_c1, a1-b1-c1, a1_b1_c1
                    //不合法: 1, a-, a_, a_1, a-1
                    setTimeout(() => {
                        if (!ValidateName(v)) {
                            done(`请输入合法的${title}名称`);
                            return;
                        }
                        done(null, true);
                    }, 0)
                },
                filter: function (v) {
                    return v;
                }
            })
        }

        projectPrompt.push(
            {
                type: 'input',
                name: 'projectVersion',
                message: `请输入${title}版本号`,
                default: '1.0.0',
                validate: function (v) {
                    const done = this.async();
                    setTimeout(() => {
                        if (!Boolean(semver.valid(v))) {
                            done('请输入合法的版本号');
                            return;
                        }
                        done(null, true);
                    }, 0);
                    return;
                },
                filter: function (v) {
                    if (semver.valid(v)) {
                        return semver.valid(v);
                    } else {
                        return v;
                    }
                }
            }, {
            type: 'list',
            name: 'projectTemplate',
            message: `请选择${title}模板`,
            choices: this.createTemplateChoice()
        })

        //2、获取项目基本信息
        if (type === TYPE_PROJECT) {
           
            const project = await inquirer.prompt(projectPrompt)
            
            projectInfo = {
                ...projectInfo,
                type,
                ...project,
            }
        } else if (type === TYPE_COMPONENT) {
            const descriptionPrompt = {
                type: 'input',
                name: 'componentDesc',
                message: '请输入组件描述信息',
                default: '',
                validate: function (v) {
                    const done = this.async();
                    setTimeout(() => {
                        if (!v) {
                            done('请输入组件描述信息');
                            return;
                        }
                        done(null, true);
                    }, 0);
                    return;
                },
            }

            projectPrompt.push(descriptionPrompt);
            const component = await inquirer.prompt(projectPrompt);

            projectInfo = {
                ...projectInfo,
                type,
                ...component
            }
        }

        // 生成classname
        if (projectInfo.projectName) {
            projectInfo.name = projectInfo.projectName;
            projectInfo.className = require('kebab-case')(projectInfo.projectName).replace(/^-/, '');
        }
        if (projectInfo.projectVersion) {
            projectInfo.version = projectInfo.projectVersion
        }
        if (projectInfo.componentDesc) {
            projectInfo.description = projectInfo.componentDesc
        }
        return projectInfo;
    }

    createTemplateChoice() {
        return this.template.map(item => ({
            value: item.npmName,
            name: item.name
        }))
    }

    isDirEmpty(localPath) {
        let fileList = fs.readdirSync(localPath);
        fileList = fileList.filter(file => (
            !file.startsWith('.') && ['node_modules'].indexOf(file) < 0
        ))
        return !fileList || fileList.length <= 0;
    }

}

function init(argv) {
    return new InitCommand(argv);
}


module.exports = init;
module.exports.InitCommand = InitCommand;