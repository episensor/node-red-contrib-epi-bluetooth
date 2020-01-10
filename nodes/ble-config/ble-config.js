module.exports = function(RED) {
    function BluetoothService(n) {
        RED.nodes.createNode(this, n);
        this.name = n.name;
        this.advertisement = n.advertisement;
    }
    RED.nodes.registerType("bluetooth-config", BluetoothService);
}
