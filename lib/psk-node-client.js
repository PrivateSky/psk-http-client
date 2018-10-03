require("./psk-abstract-client");

const http = require("http");
const URL = require("url").URL || require("url").Url;
const userAgent = 'PSK NodeAgent/0.0.1';

console.log("PSK node client loading");

$$.remote.doHttpPost = function (url, data, callback){
	let innerUrl;
	try{
		innerUrl = new URL(url);
	}catch(err){
		innerUrl = new URL().parse(url);
	}

	const options = {
		hostname: innerUrl.hostname,
		path: innerUrl.pathname,
		port: parseInt(innerUrl.port),
		headers: {
			'User-Agent': userAgent
		},
		method: 'POST'
	};

	let req = http.request(options, (res) => {
		const { statusCode } = res;

		let error;
		if (statusCode !== 201) {
			error = new Error('Request Failed.\n' +
				`Status Code: ${statusCode}`);
		}

		if (error) {
			callback(error);
			// free up memory
			res.resume();
			return;
		}

		let rawData = '';
		res.on('data', (chunk) => { rawData += chunk; });
		res.on('end', () => {
			try {
				callback(null, rawData);
			} catch (err) {
				callback(err);
			}
		});
	}).on("error", (error) => {
        console.log("POST Error", error);
		callback(error);
	});

	if(typeof data !== 'string') {
		data = JSON.stringify(data);
	}

	req.write(data);
	req.end();
};

$$.remote.doHttpGet = function doHttpGet(url, callback){
    let innerUrl;
    try{
        innerUrl = new URL(url);
    }catch(err){
        innerUrl = new URL().parse(url);
    }

	const options = {
		hostname: innerUrl.hostname,
		path: innerUrl.pathname + innerUrl.search,
		port: parseInt(innerUrl.port),
		headers: {
			'User-Agent': userAgent
		},
		method: 'GET'
	};

	let req = http.request(options, (res) => {
		const { statusCode } = res;

		let error;
		if (statusCode !== 200) {
			error = new Error('Request Failed.\n' +
				`Status Code: ${statusCode}`);
			error.code = statusCode;
		} 

		if (error) {
			callback(error);
			// free up memory
			res.resume();
			return;
		}

		let rawData = '';
		res.on('data', (chunk) => { console.log("Getting data"); rawData += chunk; });
		res.on('end', () => {
			try {
				callback(null, rawData);
			} catch (err) {
				console.log("Client error:", err);
			}
		});
	});

	req.on("error", (error) => {
		console.log("GET Error", error);
		callback(error);
	});

	req.end();
};
