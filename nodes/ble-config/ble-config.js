var BleProvider = require('../../core/bleProvider');
var BleNodes = require('../../core/bleNodes');

module.exports = function(RED) {
    function BluetoothConfig(n) {
        RED.nodes.createNode(this, n);
        this.name = n.name;
        this.retryLimit = parseInt(n.retryLimit);

        var _this = this;
        // Copies the fields from the array
        // to this while checking if the value
        // should be read as a string or pulled from
        // the context
        [
            'infoName',
            'infoVendor',
            'infoSerial'
        ].forEach(function(field) {
            var fieldType = n[field + 'Type'];
            var fieldValue = n[field];

            if (fieldType === 'global') {
                var contextField = RED.util.parseContextStore(fieldValue);

                _this[field] = _this.context().global.get(contextField.key, contextField.store);
            } else if (fieldType === 'str') {
                _this[field] = fieldValue;
            }
        });
    }

    RED.nodes.registerType('ble-config', BluetoothConfig);

    // Initialize the Bluetooth Device
    RED.events.on('runtime-event', function runtimeHandler(ev) {
        if (ev.id === 'runtime-state') {
            var nodes = BleNodes.getBleNodes();

            // Initialize BleProvider only when there are active BT nodes
            var bleProvider = BleProvider.getBleProvider(RED); 
            
            if (nodes.nodes.size > 0) {
                console.log('initialized');
                
                bleProvider.initialize();
            } else {
                bleProvider.destroy();
            }
        }
    });
}
