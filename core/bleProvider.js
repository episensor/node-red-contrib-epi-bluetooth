var Bleno = require('../lib/bleno/bleno');

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
    this.isConnected = false;
    this.bleNodes = bleNodes;
    this.bleno = new Bleno();
    this.bleJsonTransport = new BleJsonTransport();
    this.nodeRed = nodeRed;

    var _this = this;

    // Bleno Event Handlers ---------------------
    this.bleno.on('stateChange', function bleStateChange(state) {
        if (state === 'poweredOn') {
            _this.isAdapterPowered = true;
        };
        if (state === 'poweredOff') {
            _this.isAdapterPowered = false;
        };
    });

    this.bleno.on('accept', function bleAccepted() {
        this.isConnected = true;
    });

    this.bleno.on('disconnect', function bleDisconnected() {
        this.isConnected = false;
    });

    // Node Callback Handlers -------------------
    this.bleNodes.callbacks.onCharacteristicRemoved = function() {
        _this._setup();
    };

    this.bleNodes.callbacks.onServiceRemoved = function() {
        // If there are no nodes - reset and stop advertising
        if (_this.bleNodes.nodes.length === 0) {
            _this.disconnect();
            _this.setServices([]);
            _this.stopAdvertising();
            _this.isAdvertising = false;
        } else {
            _this._setup();
        }
    };
};

BleProvider.prototype.initialize = function(name, advertisement) {
    if (
        this.name !== name ||
        this.advertisement !== advertisement
    ) {
        var _this = this;
        
        _this.name = name || '!Undefined Name';
        _this.advertisement = advertisement;

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
            var startAdvertCb = function() {
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
            }

            if (typeof advertisement !== 'undefined') {
                var eirPayload = _this._createEIRPayload(name, advertisement);

                _this.bleno.startAdvertisingWithEIRData(eirPayload.advertisement, eirPayload.scanData, startAdvertCb);
            } else {
                var serviceUids = _.chain(nodesDefs)
                    .map('service')
                    .uniq()
                    .value();
                
                _this.bleno.startAdvertising(name, serviceUids, startAdvertCb);
            }
        } else {
            reject('Can\'t start advertising - adapter is not powered');
        }
    });
}

BleProvider.prototype._createEIRPayload = function(name, advertisement) {
    var advertisementData = new Buffer(4 + advertisement.length);
    var scanData = new Buffer(2 + name.length);

    // Fill Advertisement data
    advertisementData.writeUInt8(2, 0);
    advertisementData.writeUInt8(0x00, 1);
    advertisementData.writeUInt8(0x16, 2);

    var advertBuffer = new Buffer(advertisement);
    advertisementData.writeUInt8(advertBuffer.length, 3);
    advertBuffer.copy(advertisementData, 4);

    // Generate Name buffer and copy it to scanData
    var nameBuffer = new Buffer(name);

    scanData.writeUInt8(1 + nameBuffer.length, 0);
    scanData.writeUInt8(0x08, 1);
    nameBuffer.copy(scanData, 2);

    return {
        scanData: scanData,
        advertisement: advertisementData,
    };
}

var instance = null;
module.exports.getBleProvider = function(RED) {
    if (!instance) {
        var bleNodes = BleNodes.getBleNodes(RED);
        instance = new BleProvider(bleNodes, RED);
    }
    return instance;
};
