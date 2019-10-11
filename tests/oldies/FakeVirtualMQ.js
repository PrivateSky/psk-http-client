
exports.initServer = function(getResponses, postResponses){

    $$.remote.doHttpPost = function (url, data, callback) {
        console.log("POST:", url);
        var res = postResponses[url];
        if (res) {
            if (typeof res == "function") {
                res = res(data);
                }
            callback(null, res);
            }
            else {
                callback(new Error("PostFail!"));
            }
        }

    $$.remote.doHttpGet = function doHttpGet(url, callback){

        var res = getResponses[url];
        if (res) {
            if (typeof res == "function") {
                res = res();
            }
        }

        console.log("GET:", url, !res?"Fail":"Success");

        if(res == null){
            callback(new Error("Timeout"));
        } else {
            callback(null, res);
        }


    }
}