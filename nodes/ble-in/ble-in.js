var BleNodes = require('../../core/bleNodes');
var BleProvider = require('../../core/bleProvider');

module.exports = function (RED) {
    "use strict";
    function BluetoothLeInput(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        var bleConfig = RED.nodes.getNode(config.bluetooth);
        var bleNodes = BleNodes.getBleNodes(RED);
        var bleProvider = BleProvider.getBleProvider(RED);

        node.serviceUid = config.service;
        node.characteristicUid = config.characteristic;
        node.bleConfig = {
            name: bleConfig.name,
            advertisement: bleConfig.advertisement,
        };

        bleNodes.registerNode(
            node.id,
            node.serviceUid,
            node.characteristicUid, {
                onWriteRequest: function(data) {
                    node.send({
                        payload: data
                    });
                }
            },
            ['write', 'writeWithoutResponse']
        );

        bleProvider.initialize(
            node.bleConfig.name,
            node.bleConfig.advertisement
        );

        this.on('close', function bleInputClose() {
            bleNodes.destroy(node.id);
        });
    }
    RED.nodes.registerType('ble-in', BluetoothLeInput);
};
