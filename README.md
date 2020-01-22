node-red-contrib-epi-bluetooth
========================
A set of <a href="http://nodered.org" target="_new">Node-RED</a> nodes for creating BluetoothLE host services with JSON based transport.

Available Nodes:
- Input
- Notify

Install
-------
Run the following command in your Node-RED user directory - typically `~/.node-red`

    npm install node-red-contrib-epi-bluetooth

Usage
-----
After adding your first BLE node to your flow you will need to create a global Device Configuration that will be visible to the connecting Clients.

To do this enter the configuration of the new node and add a new Device definition:
![Create a new Device](https://i.imgur.com/FOEo43c.png)

Next enter the device name that will be shown to clients when scanning and click Add:
![Enter device name](https://i.imgur.com/p0Sw77u.png)

Next you need to define a Service under which the assigned GATT Characteristics (Nodes) will be visible to clients:
![Create a Service](https://i.imgur.com/k4WWiHu.png)

Enter the Service Name (used for identification within NodeRed) and a Universally Unique Identifier (UUID) of the service.
You can use for example [Online UUID Generator](https://www.uuidgenerator.net/) for getting one. Click Add afterwards.
![Set Up a Service](https://i.imgur.com/cfiSwNP.png)

Finally enter a GATT Characteristic UUID unique for a particular node and click Done. **This must be unique for each node!**
![Set characteristic](https://i.imgur.com/RUoQXhR.png)

When creating further nodes you can just select the defined Device and Service and only add unique Characteristic Ids.

Nodes
-----
After saving, the Flow containing the BLE nodes will start advertising the device with services/characteristics attached. When a client successfully connects to a device it can access particular Nodes by the assigned Service/Characteristic UUIDs.

**ble-in**
This node will receive inputs from connected clients. It is Write-Only and accepts JSON strings which need to be split in to 20 characters packets. When the last character will be a `\n` the node will know that this is the end of the message. Afterwards it will parse the JSON string and pass the object down the flow through the `msg.payload` field.

**ble-notify**
A Subscription node which clients can listen to. Upon receiving an input message it will push a Notification event to the active listeners. Like in **ble-in** the messages from `msg.payload` will be split into 20 character JSON chunks. The final chunk will contain a `\n` character which marks the end of the JSON payload.


Caveats
-------
- There should be only ONE Device assigned to every BleNode. Adding more devices will result in a warning message in NodeRed log.
