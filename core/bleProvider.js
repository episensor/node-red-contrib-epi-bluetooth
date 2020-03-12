var Bleno = require('../lib/bleno/bleno');

var BleNodes = require('./bleNodes');
var BleJsonTransport = require('./bleJsonTransport');
var BleDevInfoServiceFactory = require('./bleDevInfoServiceFactory');

var _ = require('lodash');

var REINIT_TIMEOUT = 10000;

var BleProvider = function(bleNodes, nodeRed) {
    this.name =  '';
    this.advertisement = '';
    this.initTimeout;
    this.isAdapterPowered = false;
    this.isAdvertising = false;
    this.isConnected = false;
    this.bleNodes = bleNodes;
    this.bleDevServiceFactory = new BleDevInfoServiceFactory();
    this.bleJsonTransport = new BleJsonTransport();
    this.nodeRed = nodeRed;

    this.reinitRetryInterval;
    this.reinitAttempt = 0;
};

BleProvider.prototype.setDeviceConfig = function(name, deviceInfo) {
    this.name = name || '!Undefined Name';
    this.deviceInfo = deviceInfo;
}

BleProvider.prototype.initialize = function() {
    var _this = this;

    return new Promise(function initializeHandler(resolve) {
        var initialize = function() {
            // If bleno is not instantiated yet - try to create it and wait for powerOn
            if (!_this.isAdapterPowered) {
                _this._initializeBleno(function powerOnCb() {
                    _this.nodeRed.log.info('BleProvider: Bluetooth successfully initialized.');
                    
                    // Made it to powerOn - retrying no longer needed
                    clearInterval(_this.reinitRetryInterval);
    
                    _this._setup(_this.name, _this.deviceInfo)
                        .then(function setupComplete() {
                            _this.nodeRed.log.info('BleProvider: Services and Characteristics registerd.');
                            _this.nodeRed.log.info('BleProvider: Started advertising as ' + _this.name + '.');
                        })
                        .then(resolve);
                });
            // If an instance is already present - just recreate the Services / Characteristics
            } else {
                // Bluetooth reinitialization interval
                clearInterval(_this.reinitRetryInterval);

                _this._setup(_this.name, _this.deviceInfo)
                    .then(function reSetupComplete() {
                        _this.nodeRed.log.info('BleProvider: Services and Characteristics re-registerd.');
                    })
                    .then(resolve);
            }
        };

        clearInterval(_this.reinitRetryInterval);

        // If the adapter won't power on within REINIT_TIMEOUT - retry
        _this.reinitRetryInterval = setInterval(function reinitCb() {
            _this.nodeRed.log.info('BleProvider: Failed to initialize Bluetooth, reinitializing...');

            initialize();
        }, REINIT_TIMEOUT);

        // Try to initialize early
        initialize();
    });
}

BleProvider.prototype._initializeBleno = function(adapterPoweredOnCb, failedCb) {
    var _this = this;

    // When reinitializing - remove the previous event listeners
    if (_this.bleno) {
        _this.bleno.removeAllListeners();
    }

    try {
        this.bleno = new Bleno();

        // Bleno Event Handlers ---------------------
        _this.bleno.on('stateChange', function bleStateChange(state) {
            if (state === 'poweredOn') {
                _this.isAdapterPowered = true;

                if (adapterPoweredOnCb) {
                    _this.nodeRed.log.info('BleProvider: BT Adepter PoweredOn!');

                    adapterPoweredOnCb();
                }
            };
            if (state === 'poweredOff') {
                _this.nodeRed.log.info('BleProvider: BT Adepter PoweredOff!');

                _this.isAdapterPowered = false;
            };
        });

        _this.bleno.on('accept', function bleAccepted(clientAddress) {
            _this.nodeRed.log.info('BleProvider: Client connected! ' + (clientAddress ? ('Address: ' + clientAddress) : ''));

            this.isConnected = true;
        });

        _this.bleno.on('disconnect', function bleDisconnected(clientAddress) {
            _this.nodeRed.log.info('BleProvider: Client disconnected. ' + (clientAddress ? ('Address: ' + clientAddress) : ''));

            this.isConnected = false;
        });

        _this.bleno.on('advertisingStop', function bleAdvertStopped() {
            _this.nodeRed.log.info('BleProvider: Advertising stopped.');
        });
    } catch (exc) {
        if (typeof failedCb === 'function') {
            failedCb(exc);
        }
    }
}

BleProvider.prototype._setup = function(name, deviceInfo) {
    var _this = this;

    return new Promise(function setupHandler(resolve, reject) {
        if (_this.isAdapterPowered) {
            // If the device is already advertising - stop
            if (_this.isAdvertising) {
                _this.bleno.stopAdvertising(function stopAdvertCb() {
                    _this.isAdvertising = false;
                });
            }
            
            // If deviceInfo is provided - create service for exposing it
            var deviceInfoService = deviceInfo ? 
                _this.bleDevServiceFactory.createService(_this.bleno, deviceInfo) : null;
            
            var nodesDefs = Array.from(_this.bleNodes.nodes.values());            

            // Start advertising
            var startAdvertCb = function() {
                _this.isAdvertising = true;

                // Build service/characteristics structure
                var commsServices = _this.bleNodes.services.map(function serviceMapIterator(serviceDef) {
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

                var services = commsServices;

                // Merge the deviceInfoService with other if exists
                if (deviceInfoService) {
                    services = services.concat([deviceInfoService]);
                }

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
                    .concat(deviceInfoService ? [deviceInfoService.uuid] : [])
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
