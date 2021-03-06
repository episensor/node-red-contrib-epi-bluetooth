var BleNodes = require('../../core/bleNodes');
var BleProvider = require('../../core/bleProvider');

module.exports = function (RED) {
    "use strict";
    function BluetoothLeInput(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        var bleConfig = RED.nodes.getNode(config.bluetooth);
        var bleService = RED.nodes.getNode(config.service);
        var bleNodes = BleNodes.getBleNodes(RED);
        var bleProvider = BleProvider.getBleProvider(RED);

        node.serviceUid = bleService.uuid;
        node.characteristicUid = config.characteristic;
        node.bleConfig = {
            name: bleConfig.name,
            deviceInfo: {
                vendorName: bleConfig.infoVendor,
                deviceName: bleConfig.infoName,
                deviceSerial: bleConfig.infoSerial
            },
            retryLimit: bleConfig.retryLimit
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

        bleProvider.setDeviceConfig(
            node.bleConfig.name,
            node.bleConfig.deviceInfo,
            node.bleConfig.retryLimit
        );

        this.on('close', function bleInputClose() {
            bleNodes.destroyNode(node.id);
        });
    }
    RED.nodes.registerType('ble-in', BluetoothLeInput);
};
