var BleNodes = require('./../../core/bleNodes');
var BleProvider = require('./../../core/bleProvider');

module.exports = function (RED) {
    "use strict";
    function BluetoothLeNotify(config) {
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

        var bleInterface = bleNodes.registerNode(
            node.id,
            node.serviceUid,
            node.characteristicUid,
            null,
            ['notify']
        );

        bleProvider.initialize(
            node.bleConfig.name,
            node.bleConfig.advertisement
        );

        this.on('input', function bleInput(msg) {
            if (bleInterface.isInitialized) {
                bleInterface.notify(msg.payload);
            } else {
                RED.log.warn('bleNotify: received input but BLE interface is not initialized');
            }
        });

        this.on('close', function bleInputClose() {
            bleNodes.destroy(node.id);
        });
    }
    RED.nodes.registerType("ble-notify", BluetoothLeNotify);
};
