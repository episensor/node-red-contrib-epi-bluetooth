var _ = require('lodash');

var BleNodes = function(nodeRed) {
    this.nodes = new Map();
    this.nodeRed = nodeRed;
    this.services = [];

    this.callbacks = {
        onNodeAdded: function() { },
        onCharacteristicRemoved: function() { },
        onServiceRemoved: function() { }
    };
}

/**
 * Will register the node and return an interface
 * object which should be populated with isInitialized
 * and notify() by the provider
 */
BleNodes.prototype.registerNode = function(
    nodeId,
    service,
    characteristic,
    callbacks,
    properties,
) {
    var serviceUid = service.replace(/-/g, '');
    var characteristicUid = characteristic.replace(/-/g, '');

    // Register the node
    this.nodes.set(nodeId, {
        service: serviceUid,
        characteristic: characteristicUid
    });
    
    // Will be populated by the Provider Setup
    var interface = {
        isInitialized: false,
        notify: function() { }
    };

    // Find the service
    var serviceDef = _.find(this.services, { uid: serviceUid });

    // Create the service if non existant
    if (!serviceDef) {
        serviceDef = {
            uid: serviceUid,
            characteristics: [],
        };
        this.services.push(serviceDef);
    }

    // Prevent duplicated characteristics...
    if (!_.some(serviceDef.characteristics, { uid: characteristicUid })) {
        // Add the characteristic
        serviceDef.characteristics.push({
            uid: characteristicUid,
            callbacks: callbacks || { },
            properties: properties || [ ],
            interface: interface,
        });
    }

    // Notify
    this.callbacks.onNodeAdded(
        serviceUid,
        characteristicUid,
        nodeId,
    );

    return interface;
}

BleNodes.prototype.destroyNode = function(nodeUid) {
    var nodeDef = this.nodes.get(nodeUid);

    if (nodeDef) {
        var service = _.find(this.services, { uid: nodeDef.service });
        var charToDeleteIndex = _.findIndex(service.characteristics, { uid: nodeDef.characteristic });

        // Remove the nodes characteristic
        if (charToDeleteIndex >= 0) {
            service.characteristics.splice(charToDeleteIndex, 1);

            this.callbacks.onCharacteristicRemoved(nodeDef.characteristic);
        }

        // If the service is out of characteristics - remove the service
        if (service.characteristics.length === 0) {
            var serviceToDeleteIndex = _.findIndex(this.services, { uid: nodeDef.service });
            this.services.splice(serviceToDeleteIndex, 1);

            this.callbacks.onServiceRemoved(nodeDef.service);
        }

        this.nodes.delete(nodeUid);
    }
}

var instance = null;
module.exports.getBleNodes = function(RED) {
    if (!instance) {
        instance = new BleNodes(RED);
    }
    return instance;
};
