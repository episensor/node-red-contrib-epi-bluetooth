var Bleno = require('./../lib/bleno');

var BleNodes = require('./bleNodes');
var BleJsonTransport = require('./bleJsonTransport');

var _ = require('lodash');

// Defines after what time the device should start
// the initialization after receiving the last node definition
var INIT_DEBOUNCE_TIME = 100;

var BleProvider = function(bleNodes, nodeRed) {
    this.name =  '';
    this.advertisement = '';
    this.initTimeout;
    this.isAdapterPowered = false;
    this.isAdvertising = false;
    this.bleNodes = bleNodes;
    this.bleno = new Bleno();
    this.bleJsonTransport = new BleJsonTransport();
    this.nodeRed = nodeRed;

    var _this = this;

    this.bleno.on('stateChange', function bleStateChange(state) {
        console.log('Adapter state changed: ' + state);
        if (state === 'poweredOn') {
            console.log('adapter powered on');
            _this.isAdapterPowered = true;
        };
    });

    this.bleno.on('disconnect', function bleDisconnected() {
        console.log('disconnected');
    });

    this.bleno.on('rssiUpdate', function(rssi) {
        console.log('RSSI updated ' + rssi);
    });
    this.bleno.on('advertisingStop', function() {
        console.log('Advertisong stopped!');
    });
};

BleProvider.prototype.initialize = function(name, advertisement) {
    if (
        this.name !== name ||
        this.advertisement !== advertisement
    ) {
        var _this = this;
        
        _this.name = name || '!Undefined Name';
        _this.advertisement = advertisement || '';

        return new Promise(function initializeHandler(resolve, reject) {
            clearTimeout(this.initTimeout);
            this.initTimeout = setTimeout(function() {
                _this._setup(
                        _this.name,
                        _this.advertisement
                    )
                    .then(resolve);
            }, INIT_DEBOUNCE_TIME);
        });
    }

    return Promise.resolve();
}

BleProvider.prototype._setup = function(name, advertisement) {
    var _this = this;

    return new Promise(function setupHandler(resolve, reject) {
        if (_this.isAdapterPowered) {
            // If the device is already advertising - stop
            if (_this.isAdvertising) {
                _this.bleno.stopAdvertising(function stopAdvertCb() {
                    _this.isAdvertising = false;
                });
            }
            // Start advertising
            const nodesDefs = Array.from(_this.bleNodes.nodes.values());
            
            var serviceUids = _.chain(nodesDefs)
                .map('service')
                .uniq()
                .value();
            
            _this.bleno.startAdvertising(name, serviceUids, function startAdvertCb() {
                _this.isAdvertising = true;

                // Build service/characteristics structure
                var services = _this.bleNodes.services.map(function serviceMapIterator(serviceDef) {
                    var characteristics =
                        serviceDef.characteristics.map(function characteristicMapIterator(charDef) {
                            // Define callbacks and properties based on available callbacks
                            var callbacks = {};

                            // Write Handler
                            if (charDef.callbacks.onWriteRequest) {
                                var appendChunk = _this.bleJsonTransport.chunkStream(
                                    serviceDef.uid,
                                    charDef.uid,
                                    // Pass the write handler to Chunk Stream Complete CB
                                    charDef.callbacks.onWriteRequest,
                                    function onChunkStreamError(reason) {
                                        _this.nodeRed.log.error(reason);
                                    }
                                )
                                callbacks.onWriteRequest = function providerWriteRequest(data, offset, wR, cb) {
                                    var isOk = appendChunk(data);
                                    cb(
                                        isOk ?
                                            _this.bleno.Characteristic.RESULT_SUCCESS :
                                            _this.bleno.Characteristic.RESULT_UNLIKELY_ERROR
                                    );
                                }
                            }

                            var charConfig = Object.assign({}, callbacks, {
                                uuid: charDef.uid,
                                properties: charDef.properties,
                            });
                            var characteristic = new _this.bleno.Characteristic(charConfig);

                            // Override interface
                            charDef.interface.notify = function(data) {
                                _this.bleJsonTransport.chunkify(data, function chunkifyIterator(jsonChunkBuffer) {
                                    if (characteristic.updateValueCallback) {
                                        characteristic.updateValueCallback(jsonChunkBuffer);
                                    }
                                });
                            }
                            charDef.interface.isInitialized = true;

                            return characteristic;
                        });

                    return new _this.bleno.PrimaryService({
                        uuid: serviceDef.uid,
                        characteristics: characteristics,
                    });
                });

                _this.bleno.setServices(services, function() {
                    resolve();
                });
            });
            /*
            var advBuffer = Buffer.from(advertisement, 'utf-8');

            var nameBuffer = Buffer.from(name, 'utf-8');
            var scanBuffer = new Buffer(nameBuffer.length + 2);
            scanBuffer.writeUInt8(nameBuffer.length + 1);
            scanBuffer.writeUInt8(0x08, 1);

            _this.bleno.startAdvertisingWithEIRData(advBuffer, scanBuffer, function startAdvertCb() {
                _this.isAdvertising = true;
                resolve();
            });
            */
        } else {
            reject('Can\'t start advertising - adapter is not powered');
        }
    });
}

//BleProvider.prototype.

BleProvider.prototype._createEIRPayload = function(name, advertisement, services) {
}

/**
 * 
 */
BleProvider.prototype.registerHandler = function(config) {

}

BleProvider.prototype.destroy = function() {

}

var instance = null;
module.exports.getBleProvider = function(RED) {
    if (!instance) {
        var bleNodes = BleNodes.getBleNodes();
        instance = new BleProvider(bleNodes, RED);
    }
    return instance;
};
