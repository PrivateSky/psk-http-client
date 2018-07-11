
require("../lib/psk-abstract-client");
var fakeVMQ = require("./FakeVirtualMQ");


function CryptoProvider(){
    var uid = 0;
    this.generateSafeUid = function(){
        uid++;
    }

    this.signSwarm = function(swarm, agent){
        swarm.meta.signature = agent;
    }
}


$$.remote.cryptoProvider = new CryptoProvider();

var savedData = null;

var postResponses = {
    "server/agentForANode":function(data){
        savedData = data;
        return "ok";
    }
}

var getResponses = {
    "server/myAgent":function(){
        return savedData;
    }
}


fakeVMQ.initServer(getResponses, postResponses);

$$.remote.newEndPoint("clientAgent", "server/agentForANode","server/myAgent","cryptoInfo");

$$.remote.createRequestManager(1000);

$$.remote.clientAgent.startSwarm("testSwarm.js", "hello", "World").onReturn(function(err, result){
    console.log(result);
});

