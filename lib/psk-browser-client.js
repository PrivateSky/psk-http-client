$$.remote.doHttpPost = function (url, data, callback) {

    var xhr = new XMLHttpRequest();
    xhr.responseType = 'json';
    xhr.timeout = 60000; //one minute

    xhr.onload = function () {
        var data = xhr.responseText;
        if (xhr.readyState == 4 && xhr.status == "200") {
            callback(null, data);
        } else {
            callback(new Error("An error occured. StatusCode: " + xhr.status));
        }
    };

    xhr.ontimeout = function () {
        //TODO
        //what should happen here?
    }
    xhr.open("POST", url, true);
    xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    xhr.send(JSON.stringify(data));
};


$$.remote.doHttpGet = function doHttpGet(url, callback) {

    var xhr = new XMLHttpRequest();
    xhr.responseType = 'json';

    xhr.onload = function () {
        if (xhr.readyState == 4 && xhr.status == "200") {
            var data = xhr.responseText;
            callback(null, data);
        } else {
            callback(new Error("An error occured. StatusCode: " + xhr.status));
        }
    };

    xhr.open("GET", url);
    xhr.send();
};


function CryptoProvider(){

    this.generateSafeUid = function(){
        let uid = "";
        var array = new Uint32Array(10);
        window.crypto.getRandomValues(array);


        for (var i = 0; i < array.length; i++) {
            uid += array[i].toString(16);
        }

        return uid;
    }

    this.signSwarm = function(swarm, agent){
        swarm.meta.signature = agent;
    }
}



$$.remote.cryptoProvider = new CryptoProvider();