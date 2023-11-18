'use strict';

const fs = require('fs');
const path = require('path');
const fse = require('fs-extra');
const inquirer = require('inquirer');
const userHome = require('user-home');
const Command = require('@immoc-cli-dev-zed/command');
const Package = require('@immoc-cli-dev-zed/package');
const { spinnerStart } = require('@immoc-cli-dev-zed/utils');
const log = require('@immoc-cli-dev-zed/log');
const semver = require('semver');

const getProjectTemplate = require('./getProjectTemplate');

const TYPE_PROJECT = 'project';
const TYPE_COMPONENT = 'component';

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
            }
            
        } catch (error) {
            log.error(error.message)
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
        if (!await templateNpm.exists()) {
            const spinner = spinnerStart('正在下载模板...');
            try {
                await templateNpm.install();
                log.success('下载模板成功');
            } catch (error) {
                throw error
            } finally {
                spinner.stop(true);
            }
        } else {
            const spinner = spinnerStart('正在更新模板...');
            try {
                await templateNpm.update();
                log.success('更新模板成功');
            } catch (error) {
                throw error
            } finally {
                spinner.stop(true);
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
                    fse.emptyDirSync(localPath)
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
        log.verbose('type', type);
        //2、获取项目基本信息
        if (type === TYPE_PROJECT) {
            const project = await inquirer.prompt([{
                type: 'input',
                name: 'projectName',
                message: '请输入项目名称',
                default: '',
                validate: function (v) {
                    const done = this.async();
                    //合法: a, a-b, a-b-c, a_b_c, a-b1-c1, a_b1_c1, a1-b1-c1, a1_b1_c1
                    //不合法: 1, a-, a_, a_1, a-1
                    setTimeout(() => {
                        if (!/^[a-zA-Z]+([-][a-zA-Z][a-zA-Z0-9]*|[_][a-zA-Z][a-zA-Z0-9]*|[a-zA-Z0-9])*$/.test(v)) {
                            done('请输入合法的项目名称');
                            return;
                        }
                        done(null, true);
                    }, 0)
                },
                filter: function (v) {
                    return v;
                }
            }, {
                type: 'input',
                name: 'projectVersion',
                message: '请输入项目版本号',
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
                    return ;
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
                    message: '请选择项目模板',
                    choices: this.createTemplateChoice()
                }
            ])
            
            projectInfo = {
                ...project,
                type
            }
        } else if (type === TYPE_COMPONENT) {
            
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