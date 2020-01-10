module.exports = function(RED) {
    function BluetoothConfig(n) {
        RED.nodes.createNode(this, n);
        this.name = n.name;
        this.advertisement = n.advertisement;
    }
    RED.nodes.registerType('ble-config', BluetoothConfig);
}
