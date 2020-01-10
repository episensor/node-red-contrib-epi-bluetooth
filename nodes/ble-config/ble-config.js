module.exports = function(RED) {
    function BluetoothConfig(n) {
        RED.nodes.createNode(this, n);
        this.name = n.name;
        this.advertisement = n.customAdvert ? n.advertisement : undefined;
    }
    RED.nodes.registerType('ble-config', BluetoothConfig);
}
