
exports.initServer = function(getResponses, postResponses){

    $$.remote.doHttpPost = function (url, data, callback) {
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
            callback(null, res);
        }
        else {
            callback(new Error("PostFail!"));
        }
    }
}