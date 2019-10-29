let SwarmPacker = require("swarmutils").SwarmPacker;

const receiveEndpoint = process.env.RECEIVE_ENDPOINT || "receive-message/";
const sendEndpoint = process.env.SEND_ENDPOINT || "send-message/";
const createChannelEndpoint = process.env.CREATE_CHANNEL_ENDPOINT || 'create-channel/';

/**********************  utility class **********************************/
function RequestManager(pollingTimeOut){
    if(!pollingTimeOut){
        pollingTimeOut = 1000; //1 second by default
    }

    const self = this;

    function Request(endPoint, initialSwarm){
        let onReturnCallbacks = [];
        let onErrorCallbacks = [];
        let onCallbacks = [];
        const requestId = initialSwarm.meta.requestId;
        initialSwarm = null;

        this.getRequestId = function(){
            return requestId;
        };

        this.on = function(phaseName, callback){
            if(typeof phaseName != "string"  && typeof callback != "function"){
                throw new Error("The first parameter should be a string and the second parameter should be a function");
            }

            onCallbacks.push({
                callback:callback,
                phase:phaseName
            });
            self.poll(endPoint, this);
            return this;
        };

        this.onReturn = function(callback){
            onReturnCallbacks.push(callback);
            self.poll(endPoint, this);
            return this;
        };

        this.onError = function(callback){
            if(onErrorCallbacks.indexOf(callback)!==-1){
                onErrorCallbacks.push(callback);
            }else{
                console.log("Error callback already registered!");
            }
        };

        this.dispatch = function(err, result){
            if(result instanceof ArrayBuffer) {
                result = SwarmPacker.unpack(result);
            }

            result = typeof result === "string" ? JSON.parse(result) : result;

            result = OwM.prototype.convert(result);
            const resultReqId = result.getMeta("requestId");
            const phaseName = result.getMeta("phaseName");
            let onReturn = false;

            if(resultReqId === requestId){
                onReturnCallbacks.forEach(function(c){
                    c(null, result);
                    onReturn = true;
                });
                if(onReturn){
                    onReturnCallbacks = [];
                    onErrorCallbacks = [];
                }

                onCallbacks.forEach(function(i){
                    //console.log("XXXXXXXX:", phaseName , i);
                    if(phaseName === i.phase || i.phase === '*') {
                        i.callback(err, result);
                    }
                });
            }

            if(onReturnCallbacks.length === 0 && onCallbacks.length === 0){
                self.unpoll(endPoint, this);
            }
        };

        this.dispatchError = function (err) {
            for (let i = 0; i < onErrorCallbacks.length; i++) {
                const errCb = onErrorCallbacks[i];
                errCb(err);
            }
        };

        this.off = function(){
            self.unpoll(endPoint, this);
        };
    }

    this.createRequest = function(remoteEndPoint, swarm){
        return new Request(remoteEndPoint, swarm);
    };

    /* *************************** polling zone ****************************/

    const pollSet = {};

    const activeConnections = {};

    this.poll = function(remoteEndPoint, request){
        let requests = pollSet[remoteEndPoint];
        if(!requests){
            requests = {};
            pollSet[remoteEndPoint] = requests;
        }
        requests[request.getRequestId()] = request;
        pollingHandler();
    };

    this.unpoll = function(remoteEndPoint, request){
        const requests = pollSet[remoteEndPoint];
        if(requests){
            delete requests[request.getRequestId()];
            if(Object.keys(requests).length === 0){
                delete pollSet[remoteEndPoint];
            }
        }
        else {
            console.log("Unpolling wrong request:",remoteEndPoint, request);
        }
    };

    function createPollThread(remoteEndPoint){
        function reArm(){
            $$.remote.doHttpGet(remoteEndPoint, function(err, res){
                let requests = pollSet[remoteEndPoint];

                if(err){
                    for(const req_id in requests){
                        if(!requests.hasOwnProperty(req_id)) {return;}

                        let err_handler = requests[req_id].dispatchError;
                        if(err_handler){
                            err_handler(err);
                        }
                    }
                    activeConnections[remoteEndPoint] = false;
                } else {

                    for(const k in requests){
                        if(!requests.hasOwnProperty(k)) {return;}

                        requests[k].dispatch(null, res);
                    }

                    if(Object.keys(requests).length !== 0) {
                        reArm();
                    } else {
                        delete activeConnections[remoteEndPoint];
                        console.log("Ending polling for ", remoteEndPoint);
                    }
                }
            });
        }
        reArm();
    }

    function pollingHandler(){
        let setTimer = false;
        for(const remoteEndPoint in pollSet){
            if(!pollSet.hasOwnProperty(remoteEndPoint)) {return;}

            if(!activeConnections[remoteEndPoint]){
                createPollThread(remoteEndPoint);
                activeConnections[remoteEndPoint] = true;
            }
            setTimer = true;
        }
        if(setTimer) {
            setTimeout(pollingHandler, pollingTimeOut);
        }
    }

    setTimeout( pollingHandler, pollingTimeOut);
}


function extractDomainAgentDetails(url){
    const vRegex = /([a-zA-Z0-9]*|.)*\/agent\/([a-zA-Z0-9]+(\/)*)+/g;

    if(!url.match(vRegex)){
        throw new Error("Invalid format. (Eg. domain[.subdomain]*/agent/[organisation/]*agentId)");
    }

    const devider = "/agent/";
    let domain;
    let agentUrl;

    const splitPoint = url.indexOf(devider);
    if(splitPoint !== -1){
        domain = url.slice(0, splitPoint);
        agentUrl = url.slice(splitPoint+devider.length);
    }

    return {domain, agentUrl};
}

function urlEndWithSlash(url){

    if(url[url.length - 1] !== "/"){
        url += "/";
    }

    return url;
}

const OwM = require("swarmutils").OwM;

/********************** main APIs on working with remote end points **********************************/
function PskHttpClient(remoteEndPoint, agentUid, options){
    const baseOfRemoteEndPoint = remoteEndPoint; //remove last id
    let channelInitialized = false;

    remoteEndPoint = urlEndWithSlash(remoteEndPoint);

    //domainInfo contains 2 members: domain (privateSky domain) and agentUrl
    const domainInfo = extractDomainAgentDetails(agentUid);
    let homeSecurityContext = domainInfo.agentUrl;
    let returnRemoteEndPoint = remoteEndPoint;

    if(options && typeof options.returnRemote != "undefined"){
        returnRemoteEndPoint = options.returnRemote;
    }

    if(!options || options && (typeof options.uniqueId == "undefined" || options.uniqueId)){
        homeSecurityContext += "_"+Math.random().toString(36).substr(2, 9);
    }

    returnRemoteEndPoint = urlEndWithSlash(returnRemoteEndPoint);

    this.startSwarm = function(swarmName, phaseName, ...args){
        const swarm = new OwM();
        swarm.setMeta("swarmId", $$.uidGenerator.safe_uuid());
        swarm.setMeta("requestId", swarm.getMeta("swarmId"));
        swarm.setMeta("swarmTypeName", swarmName);
        swarm.setMeta("phaseName", phaseName);
        swarm.setMeta("args", args);
        swarm.setMeta("command", "executeSwarmPhase");
        swarm.setMeta("target", domainInfo.agentUrl);
        swarm.setMeta("homeSecurityContext", getRemoteToSendMessage(returnRemoteEndPoint, homeSecurityContext));

        const requestToBeReturned = $$.remote.requestManager.createRequest(getRemoteToReceiveMessage(returnRemoteEndPoint, homeSecurityContext), swarm);

        if(!channelInitialized) {
            $$.remote.doHttpPut(getRemoteToCreateChannel(returnRemoteEndPoint, homeSecurityContext), 'someSignature', (err) => {
                if(err) {
                    if(err.statusCode !== 409) {
                        console.error(err, err.statusCode);
                        requestToBeReturned.dispatchError(err);
                        channelInitialized = false;
                        return;
                    }

                    channelInitialized = true;
                }
            });
        }

        $$.remote.doHttpPost(getRemoteToSendMessage(remoteEndPoint, domainInfo.domain), SwarmPacker.pack(swarm), function (err, res) {
            if (err) {
                requestToBeReturned.dispatchError(err);
            }
        });

        return requestToBeReturned;
    };

    this.continueSwarm = function(existingSwarm, phaseName, ...args){
        const swarm = new OwM(existingSwarm);
        swarm.setMeta("phaseName", phaseName);
        swarm.setMeta("args", args);
        swarm.setMeta("command", "executeSwarmPhase");
        swarm.setMeta("target", domainInfo.agentUrl);
        swarm.setMeta("homeSecurityContext", returnRemoteEndPoint+$$.remote.base64Encode(homeSecurityContext));

        $$.remote.doHttpPost(getRemoteToSendMessage(remoteEndPoint, domainInfo.domain), SwarmPacker.pack(swarm), function(err, res){
            if(err){
                console.log(err);
            }
        });
        //return $$.remote.requestManager.createRequest(swarm.getMeta("homeSecurityContext"), swarm);
    };

    const allCatchAlls = [];
    let requestsCounter = 0;

    function CatchAll(swarmName, phaseName, callback){ //same interface as Request
        const requestId = requestsCounter++;
        this.getRequestId = function(){
            return "swarmName" + "phaseName" + requestId;
        };

        this.dispatch = function(err, result){
            result = OwM.prototype.convert(result);
            const currentPhaseName = result.getMeta("phaseName");
            const currentSwarmName = result.getMeta("swarmTypeName");
            if((currentSwarmName === swarmName || swarmName === '*') && (currentPhaseName === phaseName || phaseName === '*')) {
                return callback(err, result);
            }
        };
    }

    this.on = function(swarmName, phaseName, callback){
        const c = new CatchAll(swarmName, phaseName, callback);
        allCatchAlls.push({
            s:swarmName,
            p:phaseName,
            c:c
        });

        if(!channelInitialized) {
            $$.remote.doHttpPut(getRemoteToCreateChannel(returnRemoteEndPoint, homeSecurityContext), 'someSignature', (err) => {
                if(err) {
                    if(err.statusCode !== 409) {
                        channelInitialized = false;
                        c.dispatch(err); // should this be here?
                        return;
                    }
                }

                channelInitialized = true;
                $$.remote.requestManager.poll(getRemoteToReceiveMessage(remoteEndPoint, domainInfo.domain) , c);
            });
        } else {
            $$.remote.requestManager.poll(getRemoteToReceiveMessage(remoteEndPoint, domainInfo.domain) , c);
        }

    };

    this.off = function(swarmName, phaseName){
        allCatchAlls.forEach(function(ca){
            if((ca.s === swarmName || swarmName === '*') && (phaseName === ca.p || phaseName === '*')){
                $$.remote.requestManager.unpoll(getRemoteToReceiveMessage(remoteEndPoint, domainInfo.domain), ca.c);
            }
        });
    };

    this.uploadCSB = function(cryptoUid, binaryData, callback){
        $$.remote.doHttpPost(baseOfRemoteEndPoint + "/CSB/" + cryptoUid, binaryData, callback);
    };

    this.downloadCSB = function(cryptoUid, callback){
        $$.remote.doHttpGet(baseOfRemoteEndPoint + "/CSB/" + cryptoUid, callback);
    };

    function getRemoteToReceiveMessage(baseUrl, domain){
        return [urlEndWithSlash(baseUrl), receiveEndpoint, $$.remote.base64Encode(domain)].join("");
    }

    function getRemoteToSendMessage(baseUrl, domain){
        return [urlEndWithSlash(baseUrl), sendEndpoint, $$.remote.base64Encode(domain)].join("");
    }

    function getRemoteToCreateChannel(baseUrl, domain) {
        return [urlEndWithSlash(baseUrl), createChannelEndpoint, $$.remote.base64Encode(domain)].join("");

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
    };


    $$.remote.cryptoProvider = null;
    $$.remote.newEndPoint = function(alias, remoteEndPoint, agentUid, options){
        if(alias === "newRemoteEndPoint" || alias === "requestManager" || alias === "cryptoProvider"){
            console.log("PskHttpClient Unsafe alias name:", alias);
            return null;
        }

        $$.remote[alias] = new PskHttpClient(remoteEndPoint, agentUid, options);
    };


    $$.remote.doHttpPost = function (url, data, callback){
        throw new Error("Overwrite this!");
    };

    $$.remote.doHttpPut = function (url, data, callback){
        throw new Error("Overwrite this!");
    };

    $$.remote.doHttpGet = function doHttpGet(url, callback){
        throw new Error("Overwrite this!");
    };

    $$.remote.base64Encode = function base64Encode(stringToEncode){
        throw new Error("Overwrite this!");
    };

    $$.remote.base64Decode = function base64Decode(encodedString){
        throw new Error("Overwrite this!");
    };
}

/*  interface
function CryptoProvider(){

    this.generateSafeUid = function(){

    }

    this.signSwarm = function(swarm, agent){

    }
} */
