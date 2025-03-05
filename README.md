# @episensor/epi-bluetooth

A set of [Node-RED](http://nodered.org) nodes for creating BluetoothLE host services with JSON based transport.

## Installation

You can install this node directly from the Node-RED Palette Manager or manually using npm:

```bash
npm install @episensor/epi-bluetooth
```

## Usage

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

## Nodes

After saving, the Flow containing the BLE nodes will start advertising the device with services/characteristics attached. When a client successfully connects to a device it can access particular Nodes by the assigned Service/Characteristic UUIDs.

### ble-in

This node will receive inputs from connected clients. It is Write-Only and accepts JSON strings which need to be split in to 20 byte packets. When the last character will be a `\n` the node will know that this is the end of the message. Afterwards it will parse the JSON string and pass the object down the flow through the `msg.payload` field.

### ble-notify

A Subscription node which clients can listen to. Upon receiving an input message it will push a Notification event to the active listeners. Like in **ble-in** the messages from `msg.payload` will be split into 20 character JSON chunks. The final chunk will contain a `\n` character which marks the end of the JSON payload.

## Caveats

- There should be only ONE Device assigned to every BleNode. Adding more devices will result in a warning message in NodeRed log.

## Development

### Prerequisites

- Node.js >= 12.0.0
- npm

### Installation for Development

1. Clone the repository:
```bash
git clone https://github.com/episensor/node-red-contrib-epi-bluetooth.git
cd node-red-contrib-epi-bluetooth
```

2. Install dependencies:
```bash
npm install
```

### Testing

This package includes a comprehensive testing framework:

```bash
npm test                # Run unit tests with Jest
npm run test:watch     # Run tests in watch mode
npm run test:coverage  # Generate coverage report
npm run test:integration # Run integration tests
npm run test:node-red   # Test Node-RED compatibility
```

### Security

Run security checks:
```bash
npm run security-check  # Check for vulnerabilities
```

### Pre-publish Checks

Before publishing, run:
```bash
npm run pre-publish    # Run all tests and checks
```

### Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Support

For more information, please visit [EpiSensor Documentation](http://episensor.com/documentation/) or for support, visit [EpiSensor Helpdesk](http://episensor.com/helpdesk/)

## Supported By

An open source project supported by [EpiSensor](https://episensor.com/).

## License

MIT
