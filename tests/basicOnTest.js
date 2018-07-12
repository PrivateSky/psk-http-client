
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
        },1000);
        setTimeout(function(){
            fakeMq.push(data);
        },2000);
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

$$.remote.createRequestManager(300);

$$.remote.clientAgent.startSwarm("testSwarm.js", "Hello", "World").on("Hello",function(err, result){
    console.log("Result from on:", result);
});

$$.remote.clientAgent.startSwarm("testSwarm.js", "Hello", "World").onReturn(function(err, result){
    console.log("Result from onReturn:", result);
});

setTimeout(function(){
    $$.remote.clientAgent.startSwarm("testSwarm.js", "Hello", "World");
},200);