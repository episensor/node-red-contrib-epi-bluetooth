node-red-contrib-hello-world
========================
A <a href="http://nodered.org" target="_new">Node-RED</a> node to show Hello.

Install
-------

Run the following command in your Node-RED user directory - typically `~/.node-red`

    npm install node-red-contrib-hello

Usage
-----

This node sets "Hello World" in the `msg.payload`. There is no additional settings.

Example
-------

**With an inject node and a debug node.**

```
[{"id":"2d03f3df.af1a9c","type":"inject","z":"d798bf30.6a942","name":"","topic":"","payload":"","payloadType":"date","repeat":"","crontab":"","once":false,"x":112.5,"y":94,"wires":[["72eef86b.68ecb8"]]},{"id":"72eef86b.68ecb8","type":"hello","z":"d798bf30.6a942","name":"","x":254.5,"y":176,"wires":[["308905fc.912e1a"]]},{"id":"308905fc.912e1a","type":"debug","z":"d798bf30.6a942","name":"","active":true,"console":"false","complete":"false","x":440.5,"y":255,"wires":[]}]
```

