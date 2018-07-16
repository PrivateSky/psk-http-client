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
    xhr.send(data);
};


$$.remote.doHttpGet = function doHttpGet(url, callback) {

    var xhr = new XMLHttpRequest();
    xhr.responseType = 'json';

    xhr.onload = function () {
        var data = xhr.responseText;
        if (xhr.readyState == 4 && xhr.status == "200") {
            callback(null, data);
        } else {
            callback(new Error("An error occured. StatusCode: " + xhr.status));
        }
    };

    xhr.open("GET", url);
    xhr.send();
};