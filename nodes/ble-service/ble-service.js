module.exports = function(RED) {
    function BluetoothService(n) {
        RED.nodes.createNode(this, n);
        this.name = n.name;
        this.uuid = n.uuid;
    }
    RED.nodes.registerType('ble-service', BluetoothService);
}
