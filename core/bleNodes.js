var _ = require('lodash');

var BleNodes = function(nodeRed) {
    this.nodes = new Map();
    this.nodeRed = nodeRed;
    this.services = [];
}

BleNodes.prototype.registerNode = function(
    nodeId,
    service,
    characteristic,
    callbacks,
    properties,
    descriptors,
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

            // TODO: Reinit device
        }

        // If the service is out of characteristics - remove the service
        if (service.characteristics.length === 0) {
            var serviceToDeleteIndex = _.findIndex(this.services, { uid: nodeDef.service });
            this.services.splice(serviceToDeleteIndex, 1);

            // TODO: Reinit device
        }

        this.nodes.delete(nodeUid);
    }

    if (this.nodes.size === 0) {
        // TODO: internal event should be called to close the device
    }
}

var instance = null;
module.exports.getBleNodes = function(RED) {
    if (!instance) {
        instance = new BleNodes(RED);
    }
    return instance;
};
