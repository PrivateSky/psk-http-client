require('../../../../psknode/bundles/pskruntime');
const VirtualMQ        = require('virtualmq');
const assert           = require("double-check").assert;
const fileStateManager = require('../../../../libraries/utils/FileStateManager').getFileStateManager();
const fs               = require('fs');
const path             = require('path');
require('psk-http-client');


const tempFolder = path.resolve('../../../tmp');

const port = 9082;
const remote = "http://127.0.0.1:"+port;
const testUrl = remote+'/CSB/testId';

const flow = $$.flow.describe('CSBmanagerClientGetFail', {
	init: function (callback) {
		this.cb = callback;
		fileStateManager.saveState([tempFolder], () => {
			this.virtualMq = VirtualMQ.createPskWebServer(port, tempFolder + '/CSB');
			setTimeout(() => this.tryGet(), 500);
		});
	},
	tryGet: function() {
		$$.remote.doHttpGet(testUrl, (err, res) => {
			assert.true(err && typeof err === 'object', "Expected the request to fail but it didn't");
			assert.equal(err.code, 404, 'Did not received the expected 404 status code, got instead ' + err.code);

			this.virtualMq.close();
			fileStateManager.restoreState(this.cb);
		});
	}
})();

assert.callback("CSBmanagerClientGetFail", function (callback) {
	flow.init(callback);
}, 1500);
