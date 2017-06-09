//  redis模块

'use strict';

const redis = require('redis');

const client = redis.createClient('6379', '127.0.0.1');

client.on('error', function(error){
    console.log(error);
    console.log('服务器出错了')
})

client.on('end', function(){
    console.log('断开连接了')
})

module.exports = client;