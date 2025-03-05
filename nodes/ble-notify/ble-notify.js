var BleNodes = require('./../../core/bleNodes');
var BleProvider = require('./../../core/bleProvider');

module.exports = function (RED) {
    "use strict";
    function BluetoothLeNotify(config) {
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

        var bleInterface = bleNodes.registerNode(
            node.id,
            node.serviceUid,
            node.characteristicUid,
            null,
            ['notify']
        );
        
        bleProvider.setDeviceConfig(
            node.bleConfig.name,
            node.bleConfig.deviceInfo,
            node.bleConfig.retryLimit
        );
        
        // Set initial status
        node.status({fill:"yellow", shape:"dot", text:"initializing"});
        
        // Update status when BLE interface is initialized
        var checkInitialized = setInterval(function() {
            if (bleInterface.isInitialized) {
                clearInterval(checkInitialized);
                node.status({fill:"green", shape:"dot", text:"ready"});
            }
        }, 1000);

        this.on('input', function bleInput(msg) {
            if (bleInterface.isInitialized) {
                try {
                    bleInterface.notify(msg.payload);
                    node.status({fill:"green", shape:"dot", text:"sent"});
                    // Reset status after a short delay
                    setTimeout(function() {
                        node.status({fill:"green", shape:"dot", text:"ready"});
                    }, 1000);
                } catch (err) {
                    node.error("Error sending notification: " + err.message, msg);
                    node.status({fill:"red", shape:"dot", text:"error"});
                }
            } else {
                node.warn("Received input but BLE interface is not initialized", msg);
                node.status({fill:"yellow", shape:"ring", text:"not ready"});
            }
        });

        this.on('close', function bleInputClose(done) {
            clearInterval(checkInitialized);
            bleNodes.destroyNode(node.id);
            node.status({});
            done();
        });
    }
    RED.nodes.registerType("ble-notify", BluetoothLeNotify);
};
