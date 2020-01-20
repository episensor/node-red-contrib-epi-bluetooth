var BleProvider = require('../../core/bleProvider');

module.exports = function(RED) {
    function BluetoothConfig(n) {
        RED.nodes.createNode(this, n);
        this.name = n.name;
        this.advertisement = n.customAdvert ? n.advertisement : undefined;
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
