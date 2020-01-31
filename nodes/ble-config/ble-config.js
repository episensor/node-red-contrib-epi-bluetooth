var BleProvider = require('../../core/bleProvider');

module.exports = function(RED) {
    function BluetoothConfig(n) {
        RED.nodes.createNode(this, n);
        this.name = n.name;

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
                _this[field] = RED.util.parseContextStore(fieldValue);
            } else if (fieldType === 'str') {
                _this[field] = fieldValue;
            }
        });
    }

    RED.nodes.registerType('ble-config', BluetoothConfig);

    // Initialize the Bluetooth Device
    RED.events.on('runtime-event', function runtimeHandler(ev) {
        if (ev.id === 'runtime-deploy') {
            var bleProvider = BleProvider.getBleProvider(RED);

            bleProvider.initialize();
        }
    });
}
