

/**********************  utility class **********************************/
function RequestManager(pollingTimeOut){
    if(!pollingTimeOut){
        pollingTimeOut = 1000; //1 second by default
    }

    var self = this;

    function Request(endPoint, initialSwarm){
        var onReturnCallbacks = [];
        var onCallbacks = [];
        var requestId = initialSwarm.meta.requestId;
        initialSwarm = null;

        this.getRequestId = function(){
            return requestId;
        }

        this.on = function(phaseName, callback){
            if(typeof callback != "string"  && typeof callback != "function"){
                throw new Error("The first parameter should be a string and the second parameter should be a function");
            }

            onCallbacks.push({
                callback:callback,
                phase:phaseName
            });
            self.poll(endPoint, this);
            return this;
        }

        this.onReturn = function(callback){
            onReturnCallbacks.push(callback);
            self.poll(endPoint, this);
            return this;
        }

        this.dispatch = function(err, result){
            var resultReqId = result.meta.requestId;
            var phaseName = result.meta.phaseName;
            var onReturn = false;

            if(resultReqId == requestId){
                onReturnCallbacks.forEach(function(c){
                    c(null, result);
                    onReturn = true;
                });
                if(onReturn){
                    onReturnCallbacks = [];
                }

                onCallbacks.forEach(function(i){
                    console.log("XXXXXXXX:", phaseName , i)
                    if(phaseName == i.phase){
                        i.callback(err, result);
                    }
                });
            }

            if(onReturnCallbacks.length == 0 && onCallbacks.length == 0){
                self.unpoll(endPoint, this);
            }
        }

        this.unpoll = function(){
            self.unpoll(endPoint, this);
        }
    }

    this.createRequest = function(remoteEndPoint, swarm){
        var request = new Request(remoteEndPoint, swarm);
        return request;
    }

    /* *************************** polling zone ****************************/

    var pollSet = {
    };

    var activeConnections = {
    };

    this.poll = function(remoteEndPoint, request){
        var requests = pollSet[remoteEndPoint];
        if(!requests){
            requests = {};
            pollSet[remoteEndPoint] = requests;
        }
        requests[request.getRequestId()] = request;
    }

    this.unpoll = function(remoteEndPoint, request){
        var requests = pollSet[remoteEndPoint];
        if(requests){
            delete requests[request.getRequestId()];
            if(Object.keys(requests).length == 0){
                delete pollSet[remoteEndPoint];
            }
        }
        else {
            console.log("Unpolling wrong request:",remoteEndPoint, request);
        }
    }

    function createPollThread(remoteEndPoint){
        function reArm(){
            $$.remote.doHttpGet(remoteEndPoint, function(err, res){
                if(err){
                    activeConnections = false;
                } else {
                    var requests = pollSet[remoteEndPoint];

                    for(var k in requests){
                        requests[k].dispatch(null, res);
                    }
                    reArm();
                }
            });
        }
        reArm();
    }

    function pollingHandler(){
        for(var v in pollSet){
            if(!activeConnections[v]){
                createPollThread(v);
                activeConnections[v] = true;
            }
        }
        setTimeout( pollingHandler, pollingTimeOut);
    }

    setTimeout( pollingHandler, pollingTimeOut);
}


/********************** main APIs on working with remote end points **********************************/
function PskHttpClient(remoteEndPoint, agentUid, cryptoInfo){
    var baseOfRemoteEndPoint = remoteEndPoint; //remove last id

    this.startSwarm = function(swarmName, phaseName, ...args){
        var swarm                   = {};
        swarm.meta                  = {};
        swarm.meta.swarmId          = $$.remote.cryptoProvider.generateSafeUid();
        swarm.meta.requestId        = swarm.meta.swarmId;
        swarm.meta.swarmTypeName    = swarmName;
        swarm.meta.phaseName        = phaseName;
        swarm.meta.args             = args;
        swarm.meta.command          = "relay";
        swarm.meta.target           = agentUid;

        $$.remote.doHttpPost(remoteEndPoint, swarm, function(err, res){
            if(err){
                console.log(err);
            }
        });

        return $$.remote.requestManager.createRequest(agentUid, swarm);
    }

    var allCatchAlls = [];
    var requestsCounter = 0;
    function CatchAll(swarmName, phaseName, callback){ //same interface as Request
        var requestId = requestsCounter++;
        this.getRequestId = function(){
            var reqId = "swarmName" + "phaseName" + requestId;
            return reqId;
        }

        this.dispatch = function(err, result){
            var currentPhaseName = result.meta.phaseName;
            var currentSwarmName = result.meta.swarmTypeName;
            if(currentSwarmName == swarmName && currentPhaseName == phaseName){
                callback(err, result);
            }
        }
    }

    this.on = function(swarmName, phaseName, callback){
        var c = new CatchAll(swarmName, phaseName, callback);
        allCatchAlls.push({
            s:swarmName,
            p:phaseName,
            c:c
        });
        $$.remote.requestManager.poll(remoteEndPoint, c);
    }

    this.off = function(swarmName, phaseName){
        allCatchAlls.forEach(function(ca){
            if(ca.s == swarmName && ca.phaseName == ca.p){
                $$.remote.requestManager.unpoll(remoteEndPoint, ca.c);
            }
        })
    }

    this.uploadCSB = function(cryptoUid, binaryData, callback){
        $$.remote.doHttpPost(baseOfRemoteEndPoint + "/CSB/" + cryptoUid, binaryData, callback);
    }

    this.downloadCSB = function(cryptoUid, callback){
        $$.remote.doHttpGet(baseOfRemoteEndPoint + "/CSB/" + cryptoUid, callback);
    }
}

/********************** initialisation stuff **********************************/
if (typeof $$ === "undefined") {
    $$ = {};
}

if (typeof  $$.remote === "undefined") {
    $$.remote = {};
    $$.remote.createRequestManager = function(timeOut){
        $$.remote.requestManager = new RequestManager(timeOut);
    }


    $$.remote.cryptoProvider = null;
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



/*  interface
function CryptoProvider(){

    this.generateSafeUid = function(){

    }

    this.signSwarm = function(swarm, agent){

    }
} */
