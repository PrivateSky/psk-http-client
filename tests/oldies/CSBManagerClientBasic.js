require('../../../../builds/output/pskruntime');
const VirtualMQ        = require('virtualmq');
const assert           = require("double-check").assert;
const fileStateManager = require('../../../../libraries/utils/FileStateManager').getFileStateManager();
const fs               = require('fs');
const path             = require('path');
require('psk-http-client');


const tempFolder = path.resolve('../../../tmp');
const fileSize = 100000;

const port = 9081;
const remote = "http://127.0.0.1:"+port;
const testUrl = remote+'/CSB/testId';

const flow = $$.flow.describe('CSBmanagerClientBasic', {
	init: function (callback) {
		this.cb = callback;
		fileStateManager.saveState([tempFolder], () => {
			this.virtualMq = VirtualMQ.createPskWebServer(port, tempFolder + '/CSB');
			setTimeout(() => {
				this.postFile(() => {
					this.getFile();
				});
			}, 500);
		});
	},
	postFile: function (callback) {
		const buffer = $$.Buffer.alloc(fileSize, 'a');
		$$.remote.doHttpPost(testUrl, buffer, (err) => {
			assert.false(err, 'Post to virtualMq has failed');
			callback();
		});
	},
	getFile: function () {
		$$.remote.doHttpGet(testUrl, (err, res) => {
			assert.false(err, "Get from virtualMq has failed");
			assert.true(fileSize === res.length, 'The received file is not complete or corrupted');

			let match = true;
			for(let i = 0; i < fileSize; ++i) {
				if(res[i] !== 'a') {
					match = false;
					break;
				}
			}

			assert.true(match, 'The received file is possibly corrupted');

			this.virtualMq.close();
			fileStateManager.restoreState(this.cb);
		});
	}
})();

assert.callback("CSBmanagerClientBasic", function (callback) {
	flow.init(callback);
}, 1500);
