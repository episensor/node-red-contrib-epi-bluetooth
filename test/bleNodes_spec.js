const assert = require('assert');
const sinon = require('sinon');
const BleNodes = require('../core/bleNodes').BleNodes;

describe('BleNodes', function () {
    let bleNodes;
    let mockRED;

    beforeEach(function () {
        mockRED = {
            log: {
                info: sinon.spy(),
                warn: sinon.spy(),
                error: sinon.spy()
            }
        };
        bleNodes = new BleNodes(mockRED);
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('registerNode', function () {
        it('should register a node with valid service and characteristic', function () {
            const nodeId = 'test-node-1';
            const service = '1234-5678';
            const characteristic = 'abcd-efgh';
            const callbacks = { onWriteRequest: sinon.spy() };
            const properties = ['write'];

            const nodeInterface = bleNodes.registerNode(nodeId, service, characteristic, callbacks, properties);

            // Verify node registration
            const node = bleNodes.nodes.get(nodeId);
            assert(node, 'Node should be registered');
            assert.strictEqual(node.service, '12345678', 'Service UUID should be cleaned');
            assert.strictEqual(node.characteristic, 'abcdefgh', 'Characteristic UUID should be cleaned');

            // Verify interface creation
            assert(nodeInterface, 'Interface should be created');
            assert.strictEqual(nodeInterface.isInitialized, false, 'Interface should start uninitialized');
            assert.strictEqual(typeof nodeInterface.notify, 'function', 'Interface should have notify function');

            // Verify service creation
            const service1 = bleNodes.services[0];
            assert(service1, 'Service should be created');
            assert.strictEqual(service1.uid, '12345678', 'Service UUID should match');
            assert.strictEqual(service1.characteristics.length, 1, 'Service should have one characteristic');

            const char1 = service1.characteristics[0];
            assert.strictEqual(char1.uid, 'abcdefgh', 'Characteristic UUID should match');
            assert.strictEqual(char1.callbacks, callbacks, 'Callbacks should be set');
            assert.deepStrictEqual(char1.properties, properties, 'Properties should be set');
        });

        it('should reuse existing service for multiple characteristics', function () {
            const service = '1234-5678';
            
            // Register first node
            bleNodes.registerNode('node1', service, 'char1', null, []);
            
            // Register second node with same service
            bleNodes.registerNode('node2', service, 'char2', null, []);

            assert.strictEqual(bleNodes.services.length, 1, 'Should only create one service');
            assert.strictEqual(bleNodes.services[0].characteristics.length, 2, 'Service should have two characteristics');
        });

        it('should prevent duplicate characteristics in the same service', function () {
            const service = '1234-5678';
            const characteristic = 'char1';
            
            // Register same characteristic twice
            bleNodes.registerNode('node1', service, characteristic, null, []);
            bleNodes.registerNode('node2', service, characteristic, null, []);

            assert.strictEqual(bleNodes.services[0].characteristics.length, 1, 'Should not duplicate characteristics');
        });
    });

    describe('destroyNode', function () {
        it('should remove node and its characteristic', function () {
            // Register a node
            const nodeId = 'test-node';
            const service = '1234-5678';
            const characteristic = 'char1';
            
            bleNodes.registerNode(nodeId, service, characteristic, null, []);
            
            // Set up spies for callbacks
            bleNodes.callbacks.onCharacteristicRemoved = sinon.spy();
            bleNodes.callbacks.onServiceRemoved = sinon.spy();

            // Destroy the node
            bleNodes.destroyNode(nodeId);

            // Verify node removal
            assert(!bleNodes.nodes.has(nodeId), 'Node should be removed');
            assert(!bleNodes.interfaces.has(nodeId), 'Interface should be removed');
            
            // Verify characteristic removal callback
            assert(bleNodes.callbacks.onCharacteristicRemoved.calledWith(characteristic.replace(/-/g, '')),
                'Should call characteristic removed callback');
        });

        it('should remove service when last characteristic is removed', function () {
            const service = '1234-5678';
            
            // Register two nodes with same service
            bleNodes.registerNode('node1', service, 'char1', null, []);
            bleNodes.registerNode('node2', service, 'char2', null, []);
            
            // Set up spy for service removal callback
            bleNodes.callbacks.onServiceRemoved = sinon.spy();

            // Destroy both nodes
            bleNodes.destroyNode('node1');
            bleNodes.destroyNode('node2');

            assert.strictEqual(bleNodes.services.length, 0, 'Service should be removed');
            assert(bleNodes.callbacks.onServiceRemoved.calledWith(service.replace(/-/g, '')),
                'Should call service removed callback');
        });
    });

    describe('getNodeInterface', function () {
        it('should return the correct interface for a node', function () {
            const nodeId = 'test-node';
            const nodeInterface = bleNodes.registerNode(nodeId, '1234', '5678', null, []);
            
            const retrievedInterface = bleNodes.getNodeInterface(nodeId);
            assert.strictEqual(retrievedInterface, nodeInterface, 'Should return the correct interface');
        });

        it('should return undefined for non-existent node', function () {
            const nodeInterface = bleNodes.getNodeInterface('non-existent');
            assert.strictEqual(nodeInterface, undefined, 'Should return undefined for non-existent node');
        });
    });
}); 