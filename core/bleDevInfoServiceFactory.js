var DEVICE_INFO_SERVICE_UUID = '0x180A';
var DEVICE_VENDOR_CHAR_UUID = '0x2A29';
var DEVICE_NAME_CHAR_UUID = '0x2A24';
var DEVICE_SERIAL_CHAR_UUID = '0x2A25';

function createReadCallback(bleno, value) {
    return function (offset, callback) {
        var valBuffer = Buffer.from(value, 'utf-8');

        if (offset >= valBuffer.length) {
            callback(bleno.Characteristic.RESULT_INVALID_OFFSET, null);
        } else {
            var valueSlice = value.slice(offset);
            var valueSliceBuffer = Buffer.from(valueSlice, 'utf-8');

            callback(bleno.Characteristic.RESULT_SUCCESS, valueSliceBuffer);
        }
    }
}

function BleDevInfoServiceFactory() { }

/**
 * info: {
 *   vendorName: string,
 *   deviceName: string,
 *   deviceSerial: string
 * }
 */
BleDevInfoServiceFactory.prototype.createService = function(bleno, info) {
    var characteristics = [];

    // Vendor Name
    if (typeof info.vendorName === 'string') {
        characteristics.push(
            new bleno.Characteristic({
                uuid: DEVICE_VENDOR_CHAR_UUID,
                properties: ['read'],
                callbacks: {
                    onReadRequest: createReadCallback(bleno, info.vendorName)
                }
            })
        );
    }

    // Device Name
    if (typeof info.deviceName === 'string') {
        characteristics.push(
            new bleno.Characteristic({
                uuid: DEVICE_NAME_CHAR_UUID,
                properties: ['read'],
                callbacks: {
                    onReadRequest: createReadCallback(bleno, info.deviceName)
                }
            })
        );
    }

    // Device Serial
    if (typeof info.deviceSerial === 'string') {
        characteristics.push(
            new bleno.Characteristic({
                uuid: DEVICE_SERIAL_CHAR_UUID,
                properties: ['read'],
                callbacks: {
                    onReadRequest: createReadCallback(bleno, info.deviceSerial)
                }
            })
        );
    }

    var deviceInfoService = new bleno.PrimaryService({
        uuid: DEVICE_INFO_SERVICE_UUID,
        characteristics: characteristics,
    });

    return deviceInfoService;
}

module.exports = BleDevInfoServiceFactory;
