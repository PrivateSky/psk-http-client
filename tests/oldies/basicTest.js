
require("../lib/psk-abstract-client");
var fakeVMQ = require("./FakeVirtualMQ");


function CryptoProvider(){
    var uid = 0;
    this.generateSafeUid = function(){
        uid++;
        return uid;
    }

    this.signSwarm = function(swarm, agent){
        swarm.meta.signature = agent;
    }
}


$$.remote.cryptoProvider = new CryptoProvider();

var fakeMq = [];



var postResponses = {
    "server/agentForANode":function(data){
        setTimeout(function(){
            fakeMq.push(data);
        },3000);
        return "ok";
    }
}

var getResponses = {
    "server/myAgent":function(){
        if(fakeMq.length == 0) return null;
        return fakeMq.shift();
    }
}


fakeVMQ.initServer(getResponses, postResponses);

$$.remote.newEndPoint("clientAgent", "server/agentForANode","server/myAgent","cryptoInfo");

$$.remote.createRequestManager(100);

$$.remote.clientAgent.startSwarm("testSwarm.js", "Hello", "World").onReturn(function(err, result){
    console.log("Result 1:", result);
});

$$.remote.clientAgent.startSwarm("testSwarm.js", "Hello", "World").onReturn(function(err, result){
    console.log("Result 2:", result);
});