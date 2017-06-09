// 用来存储返回来的节点信息

const util = require('util');
const redis = require('./redis');

// 
exports.push  = function(nodes){
   
   var store = ['remotNodes'];
   for(var i = 0; i < nodes.length; i++){
       store.push(util.format('%s:%d', nodes[i].address, nodes[i].port));
   }

   console.log(store);
   
//   保存在redis里面, push到左侧， 也就是列表的顶端
     var number = redis.lpush.apply(redis, store);
     console.log('数字：', number);
    redis.ltrim('remotNodes', 0, 1000);

    nodes = null;

}
exports.pop = function (callback) {
    // callback参数是 callback(err, reply)
    redis.rpop('remotNodes', callback);
};