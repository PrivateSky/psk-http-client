
require("../../lib/psk-abstract-client");
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

$$.remote.newEndPoint("clientNodeAgent", "server/agentForANode","server/myAgent","cryptoInfo");
$$.remote.newEndPoint("clientAgent", "server/myAgent","server/myAgent","cryptoInfo");

$$.remote.createRequestManager(500);

$$.remote.clientAgent.on("testSwarm.js", "Hello", function(err, result){
    console.log("Result from clientAgent.on:", result);
});

$$.remote.clientNodeAgent.startSwarm("testSwarm.js", "Hello", "World").on(function(err, result){
    console.log("Result from startSwarm.on:", result);
});

