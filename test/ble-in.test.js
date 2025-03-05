/**
 * Unit tests for the ble-in node
 */

const BleNodes = require('../core/bleNodes');
const BleProvider = require('../core/bleProvider');

// Mock the dependencies
jest.mock('../core/bleNodes');
jest.mock('../core/bleProvider');

describe('ble-in Node', () => {
  // Mock Node-RED runtime
  const RED = {
    nodes: {
      createNode: jest.fn(),
      registerType: jest.fn(),
      getNode: jest.fn()
    }
  };

  // Mock node instance
  const node = {
    id: 'test-node-id',
    on: jest.fn(),
    send: jest.fn()
  };

  // Mock BleNodes
  const mockBleNodes = {
    registerNode: jest.fn(),
    destroyNode: jest.fn()
  };

  // Mock BleProvider
  const mockBleProvider = {
    setDeviceConfig: jest.fn()
  };

  // Mock config
  const config = {
    bluetooth: 'test-bluetooth-config-id',
    service: 'test-service-id',
    characteristic: 'test-characteristic-uuid'
  };

  // Mock bluetooth config node
  const mockBleConfig = {
    name: 'Test Device',
    infoVendor: 'EpiSensor',
    infoName: 'Test Device',
    infoSerial: '12345',
    retryLimit: 3
  };

  // Mock service node
  const mockBleService = {
    uuid: 'test-service-uuid'
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup mocks
    RED.nodes.createNode.mockImplementation((n) => {
      Object.assign(node, n);
    });

    RED.nodes.getNode.mockImplementation((id) => {
      if (id === config.bluetooth) return mockBleConfig;
      if (id === config.service) return mockBleService;
      return null;
    });

    BleNodes.getBleNodes.mockReturnValue(mockBleNodes);
    BleProvider.getBleProvider.mockReturnValue(mockBleProvider);
  });

  it('should register with Node-RED', () => {
    // Load the node
    const bleInNode = require('../nodes/ble-in/ble-in.js');
    
    // Initialize the node
    bleInNode(RED);
    
    // Verify it registered with Node-RED
    expect(RED.nodes.registerType).toHaveBeenCalledWith('ble-in', expect.any(Function));
  });

  it('should initialize correctly', () => {
    // Load the node
    const bleInNode = require('../nodes/ble-in/ble-in.js');
    
    // Get the constructor
    const BluetoothLeInput = RED.nodes.registerType.mock.calls[0][1];
    
    // Create an instance
    new BluetoothLeInput(config);
    
    // Verify node was created
    expect(RED.nodes.createNode).toHaveBeenCalledWith(expect.any(Object), config);
    
    // Verify BLE nodes were initialized
    expect(BleNodes.getBleNodes).toHaveBeenCalledWith(RED);
    expect(BleProvider.getBleProvider).toHaveBeenCalledWith(RED);
    
    // Verify node properties
    expect(node.serviceUid).toBe(mockBleService.uuid);
    expect(node.characteristicUid).toBe(config.characteristic);
    expect(node.bleConfig).toEqual({
      name: mockBleConfig.name,
      deviceInfo: {
        vendorName: mockBleConfig.infoVendor,
        deviceName: mockBleConfig.infoName,
        deviceSerial: mockBleConfig.infoSerial
      },
      retryLimit: mockBleConfig.retryLimit
    });
    
    // Verify node registration
    expect(mockBleNodes.registerNode).toHaveBeenCalledWith(
      node.id,
      node.serviceUid,
      node.characteristicUid,
      expect.objectContaining({
        onWriteRequest: expect.any(Function)
      }),
      ['write', 'writeWithoutResponse']
    );
    
    // Verify device config
    expect(mockBleProvider.setDeviceConfig).toHaveBeenCalledWith(
      node.bleConfig.name,
      node.bleConfig.deviceInfo,
      node.bleConfig.retryLimit
    );
    
    // Verify close handler
    expect(node.on).toHaveBeenCalledWith('close', expect.any(Function));
  });

  it('should handle write requests', () => {
    // Load the node
    const bleInNode = require('../nodes/ble-in/ble-in.js');
    
    // Get the constructor
    const BluetoothLeInput = RED.nodes.registerType.mock.calls[0][1];
    
    // Create an instance
    new BluetoothLeInput(config);
    
    // Get the onWriteRequest handler
    const onWriteRequest = mockBleNodes.registerNode.mock.calls[0][3].onWriteRequest;
    
    // Call the handler with test data
    const testData = { test: 'data' };
    onWriteRequest(testData);
    
    // Verify node.send was called with the data
    expect(node.send).toHaveBeenCalledWith({
      payload: testData
    });
  });

  it('should clean up on close', () => {
    // Load the node
    const bleInNode = require('../nodes/ble-in/ble-in.js');
    
    // Get the constructor
    const BluetoothLeInput = RED.nodes.registerType.mock.calls[0][1];
    
    // Create an instance
    new BluetoothLeInput(config);
    
    // Get the close handler
    const closeHandler = node.on.mock.calls[0][1];
    
    // Call the close handler
    closeHandler();
    
    // Verify node was destroyed
    expect(mockBleNodes.destroyNode).toHaveBeenCalledWith(node.id);
  });
}); 