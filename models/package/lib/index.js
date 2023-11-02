'use strict';

class Package {
    constructor(options) {
        this.targetPath = options.targetPath;   //package路径
        this.storePath = options.storePath;     //package存储路径
        this.packageName = options.name;
        this.packageVersion = options.version;
    }

    exists() { }
    
    install() { }
    
    update() { }

    getRootFilePath() { }
}

module.exports = Package;
