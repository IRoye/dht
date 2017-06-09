// 最终卡死在了  局域网的UDP 能请求其他的节点， 但是貌似收不到其他节点发来的信息

'use strict';

const dgram = require('dgram');
const bencode = require('bencode');
const crypto = require('crypto');
const bucket = require('./common/bucket');
const encoding = require("encoding");

const utils = require('./common/utils');


const server = dgram.createSocket('udp4');
// 184.144.103.35:32764
//const id = new Buffer(crypto.createHash('sha1').update(('router.utorrent.com'|| '') + '6881').digest('hex'), 'hex');
const id = new Buffer(crypto.createHash('sha1').update(('202.10.196.120'|| '') + '19660').digest('hex'), 'hex');
const target = {
    address: 'router.utorrent.com',
    port: '6881',
}

const transactionId = new Buffer([~~(Math.random() * 256), ~~(Math.random() * 256)]);
const  msg = {
            t: transactionId,
            y: 'q',
            q: 'find_node',
            a: {
        //id :（进行查询的那个节点的ID）第一次, 加入这个网络， 只能使用  公开的那个address:port
        id: new Buffer(crypto.createHash('sha1').update(('202.10.196.120'|| '') + '19660').digest('hex'), 'hex'),
        // 这个就是查询者要查的那个节点ID 
        target: new Buffer(crypto.createHash('sha1').update(crypto.randomBytes(20)).digest('hex'), 'hex')
    }
};

// 最后一并打包发给那个router.utorrent.com
const packet = bencode.encode(msg);

server.on('error', (err) => {
    console.log(`${err.stack}`);
    server.close();
})

// 对返回结果 进行解码
function decodeNodes(data) {
    var nodes = [];

    for (var i = 0; i + 26 <= data.length; i += 26) {
        nodes.push({
            id: data.slice(i, i + 20),
            address: data[i + 20] + '.' + data[i + 21] + '.' +
                data[i + 22] + '.' + data[i + 23],
            port: data.readUInt16BE(i + 24)
        });
    }
    return nodes;
};


server.on('message', (msg, info) => {
    console.log(encoding.convert(bencode.decode(msg), 'utf-8'));
    // console.log('-----------------------------');
    // console.log(encoding.convert(info, 'utf-8'));
    // console.log('-----------------------------');
    // //   最后的这些节点都存到了redis里面去了， 用来构建路由表
    // console.log(decodeNodes(bencode.decode(msg).r.nodes));
     
//     如果是被请求的话， 那么久打印出来
//  if (msg.y[0] === 0x71 /* q */) {
//         console.log('被请求了');
//     }

    // 简单的存了redis中一份， 然后又存到了  '路由表中一份'；
    utils.push(decodeNodes(bencode.decode(msg).r.nodes)); 

    //把查询返回的k个节点信息给保存起来
    bucket.push(id, [
        {
            id: bencode.decode(msg).r.id,
            address: info.address,
            port: info.port
        }
    ]);

})

server.on('listening', () => {
  const address = server.address();
  console.log(`server listening ${address.address}:${address.port}`);
});

server.bind({
    port : '6681'
});


function run() {
    var self = this,
        target;

    // 从remoteNodes里取一个，取不到就用默认的（bootstrap的节点，最多5s一次）
    utils.pop(function (error, reply) {
    
        target = {
            address: reply.split(':')[0],
            port: +reply.split(':')[1]
        } 
        sendFindNode(target);
        // 不停的发送, 3S发一次
        setTimeout(run.bind(self), 1000);
    });
};

//请求函数：
function _request(target, type, args){
    //事务ID:
   var transactionId = new Buffer([~~(Math.random() * 256), ~~(Math.random() * 256)]),
        msg = {
            t: transactionId,
            y: 'q',
            q: type,
            a: args
        },
        packet = bencode.encode(msg);

    server.send(packet, 0, packet.length, target.port, target.address);

}

// 这个target 就是新收集的那些nodes
function sendFindNode(target){

  _request(target, 'find_node', {
        id: new Buffer(crypto.createHash('sha1').update(('router.utorrent.com'|| '') + '6881').digest('hex'), 'hex'),
        target: new Buffer(crypto.createHash('sha1').update(crypto.randomBytes(20)).digest('hex'), 'hex')
  });


}
//  发送的是find_node请求
// server.send(packet, 0, packet.length, target.port, target.address);

run();