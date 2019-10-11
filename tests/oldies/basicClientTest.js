require("../../../psknode/bundles/pskruntime");
require("../../../psknode/bundles/virtualMQ");
const path = require("path");
require("psk-http-client");

const assert = require("double-check").assert;

const testPort = 9080;
const alias = "localVirtualMQ";
const agentName = "testdomain/agent/007";
const remote = "http://127.0.0.1:"+testPort;
const baseFolder = "../../../tmp";
const mainFolder = "uploads";

assert.callback("BasicNodeHttpClientTest", function(callback){
	function prepareTest(){
		var server = require("virtualmq").createVirtualMQ(testPort, path.join(baseFolder, mainFolder), runningTests);
	}

	function runningTests(){
		$$.remote.newEndPoint(alias, remote, agentName);

		$$.remote[alias].downloadCSB("superMegaIdCeNuExista", (err, result) => {
			assert.notNull(err, "Shouldn't work. The file doesn't exist!");
			assert.equal(err.statusCode, 404, "Status code should be 404");

			clean();
		});
	}

	function clean(){
		callback();
	}

	prepareTest();
}, 1500);


