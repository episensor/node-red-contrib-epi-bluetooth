var BleNodes = require('../../core/bleNodes');
var BleProvider = require('../../core/bleProvider');

module.exports = function (RED) {
    "use strict";
    function BluetoothLeInput(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        
        // Check if required configuration is provided
        if (!config.bluetooth) {
            node.error("BLE device configuration is required");
            node.status({fill:"red", shape:"ring", text:"missing config"});
            return;
        }
        
        if (!config.service) {
            node.error("BLE service configuration is required");
            node.status({fill:"red", shape:"ring", text:"missing service"});
            return;
        }
        
        if (!config.characteristic) {
            node.error("BLE characteristic UUID is required");
            node.status({fill:"red", shape:"ring", text:"missing characteristic"});
            return;
        }
        
        var bleConfig = RED.nodes.getNode(config.bluetooth);
        var bleService = RED.nodes.getNode(config.service);
        
        if (!bleConfig) {
            node.error("BLE device configuration not found");
            node.status({fill:"red", shape:"ring", text:"invalid config"});
            return;
        }
        
        if (!bleService) {
            node.error("BLE service configuration not found");
            node.status({fill:"red", shape:"ring", text:"invalid service"});
            return;
        }
        
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

        // Set initial status
        node.status({fill:"yellow", shape:"dot", text:"initializing"});

        bleNodes.registerNode(
            node.id,
            node.serviceUid,
            node.characteristicUid, {
                onWriteRequest: function(data) {
                    node.status({fill:"green", shape:"dot", text:"received"});
                    node.send({
                        payload: data
                    });
                    // Reset status after a short delay
                    setTimeout(function() {
                        node.status({fill:"green", shape:"dot", text:"ready"});
                    }, 1000);
                }
            },
            ['write', 'writeWithoutResponse']
        );

        bleProvider.setDeviceConfig(
            node.bleConfig.name,
            node.bleConfig.deviceInfo,
            node.bleConfig.retryLimit
        );
        
        // Update status when BLE interface is initialized
        var checkInitialized = setInterval(function() {
            var nodeInterface = bleNodes.getNodeInterface(node.id);
            if (nodeInterface && nodeInterface.isInitialized) {
                clearInterval(checkInitialized);
                node.status({fill:"green", shape:"dot", text:"ready"});
            }
        }, 1000);

        this.on('close', function bleInputClose(done) {
            clearInterval(checkInitialized);
            bleNodes.destroyNode(node.id);
            node.status({});
            done();
        });
    }
    RED.nodes.registerType('ble-in', BluetoothLeInput);
};
