const helper = require('node-red-node-test-helper');
const assert = require('assert');
const sinon = require('sinon');
const bleInNode = require('../nodes/ble-in/ble-in.js');
const bleNotifyNode = require('../nodes/ble-notify/ble-notify.js');

helper.init(require.resolve('node-red'));

describe('BLE Nodes', function () {
    let RED;

    beforeEach(function (done) {
        RED = {
            nodes: {
                createNode: sinon.spy(),
                registerType: sinon.spy(),
                getNode: sinon.stub()
            }
        };
        helper.startServer(done);
    });

    afterEach(function (done) {
        helper.unload().then(function () {
            helper.stopServer(done);
        });
        sinon.restore();
    });

    it('should require bluetooth configuration for ble-in node', function (done) {
        const flow = [
            { id: "n1", type: "ble-in", name: "test name" }
        ];

        helper.load(bleInNode, flow, function () {
            try {
                const n1 = helper.getNode("n1");
                assert(n1.error.called, "error should have been called");
                assert.strictEqual(n1.error.getCall(0).args[0], "BLE device configuration is required");
                done();
            } catch(err) {
                done(err);
            }
        });
    });

    it('should require bluetooth configuration for ble-notify node', function (done) {
        const flow = [
            { id: "n1", type: "ble-notify", name: "test name" }
        ];

        helper.load(bleNotifyNode, flow, function () {
            try {
                const n1 = helper.getNode("n1");
                assert(n1.error.called, "error should have been called");
                assert.strictEqual(n1.error.getCall(0).args[0], "BLE device configuration is required");
                done();
            } catch(err) {
                done(err);
            }
        });
    });

    it('should register node types', function (done) {
        bleInNode(RED);
        bleNotifyNode(RED);
        
        assert(RED.nodes.registerType.calledWith('ble-in'));
        assert(RED.nodes.registerType.calledWith('ble-notify'));
        done();
    });
}); 