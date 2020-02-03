var DEVICE_INFO_SERVICE_UUID = '180a';
var DEVICE_VENDOR_CHAR_UUID = '2a29';
var DEVICE_NAME_CHAR_UUID = '2a24';
var DEVICE_SERIAL_CHAR_UUID = '2a25';

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
                value: Buffer.from(info.vendorName, 'utf-8')
            })
        );
    }

    // Device Name
    if (typeof info.deviceName === 'string') {
        characteristics.push(
            new bleno.Characteristic({
                uuid: DEVICE_NAME_CHAR_UUID,
                properties: ['read'],
                value: Buffer.from(info.deviceName, 'utf-8')
            })
        );
    }

    // Device Serial
    if (typeof info.deviceSerial === 'string') {
        characteristics.push(
            new bleno.Characteristic({
                uuid: DEVICE_SERIAL_CHAR_UUID,
                properties: ['read'],
                value: Buffer.from(info.deviceSerial, 'utf-8')
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
