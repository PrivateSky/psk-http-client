
function RequestManager(pollingTimeOut){
    if(!pollingTimeOut){
        pollingTimeOut = 5000; //5 seconds by default
    }
    var aliveReturnRequests = {};
    var aliveOnRequests     = {};

    var waitingEndPointSet = {};

    function Request(endPoint, requestId){
        var onReturnCallbacks = [];
        var onCallbacks = [];

        this.getEndPoint = function(){
            return endPoint;
        }

        this.on = function(returnPhaseName, callback){
            onCallbacks.push(callback);
            aliveOnRequests[requestId] = this;
        }

        this.onReturn = function(callback){
            onReturnCallbacks.push(callback);
            aliveReturnRequests[requestId] = this;
        }

        this.sendResults = function(err, result, onReturn){
            var arr = onReturnCallbacks;
            if(!onReturn){
                arr = onCallbacks
            }
            arr.map(function(c){
                c(err, result);
            });

            if(onReturn){
                delete  aliveReturnRequests[requestId];
            }
        }

        this.forgetRequest = function(){
            delete  aliveOnRequests[requestId];
            delete  aliveReturnRequests[requestId];
        }
    }




    this.startSwarm = function(remoteEndPoint, swarm){
        var request = new Request(remoteEndPoint, swarm.meta.swarmId);
        return request;

    }

    this.upload     = function(remoteEndPoint, cryptoUid, binaryData, callback){

    }

    this.download   = function(remoteEndPoint, cryptoUid, callback){

    }


    function pollingHandler(){

        function checkAliveConnections(requestsSet, onReturn){

            function createAnswearClosure(request){
                var endPoint = request.getEndPoint();
                var rearm = function(){
                    if(!waitingEndPointSet[endPoint]){
                        waitingEndPointSet[endPoint] = true;
                        doHttpGet(endPoint, function(err, result){
                            if(err){
                                waitingEndPointSet[endPoint] = false;
                            } else {
                                request.sendResults(null, result, onReturn);
                                rearm();
                            }
                        });
                    }
                }

                return rearm;
            }

            for(var n in requestsSet){
                var requestCallback = createAnswearClosure(requestsSet[n])
                requestCallback();
            }
        }

        checkAliveConnections(aliveReturnRequests,  true);
        checkAliveConnections(aliveOnRequests,      false);
        setTimeout(pollingTimeOut, pollingHandler);
    }

}


function CryptoProvider(){

    this.generateSafeUid = function(){

    }

    this.signSwarm = function(swarm, agent){

    }
}



function PskHttpClient(remoteEndPoint, agentUid, cryptoInfo){
    this.startSwarm = function(swarmName, phaseName, ...args){

        var swarm                   = {};

        swarm.meta                  = {};

        swarm.meta.swarmId          = $$.remote.cryptoProvider.generateSafeUid();
        swarm.meta.swarmTypeName    = swarmName;
        swarm.meta.phaseName        = phaseName;
        swarm.meta.args             = args;
        swarm.meta.command          = "relay";
        swarm.meta.target           = agentUid;

        return $$.remote.requestManager.send(remoteEndPoint, swarm);
    }


    this.upload = function(cryptoUid, binaryData, callback){
        $$.remote.requestManager.upload(remoteEndPoint, cryptoUid, binaryData, callback);
    }

    this.download = function(cryptoUid, callback){
        $$.remote.requestManager.download(remoteEndPoint, cryptoUid, callback);
    }
}


if (typeof $$ === "undefined") {
    $$ = {};
}


if (typeof  $$.remote === "undefined") {
    $$.remote = {};
    $$.remote.requestManager = new RequestManager();

    $$.remote.changeTimeOut= function(timeOut){
        $$.remote.requestManager = new RequestManager(timeOut);
    }


    $$.remote.cryptoProvider = new CryptoProvider();
    $$.remote.newEndPoint = function(alias, remoteEndPoint, agentUid, cryptoInfo){
        if(alias == "newRemoteEndPoint" || alias == "requestManager" || alias == "cryptoProvider"){
            console.log("PskHttpClient Unsafe alias name:", alias);
            return null;
        }
        $$.remote[alias] = new PskHttpClient(remoteEndPoint, agentUid, cryptoInfo);
    };


    $$.remote.doHttpPost = function (url, callback){
        throw new Error("Overwrite this!");
    }

    $$.remote.doHttpGet = function doHttpGet(url, callback){
        throw new Error("Overwrite this!");
    }

}

