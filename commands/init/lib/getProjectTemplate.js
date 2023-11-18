const request = require('@immoc-cli-dev-zed/request');

module.exports = function () {
    return request({
        url: '/project/template'
    })
}