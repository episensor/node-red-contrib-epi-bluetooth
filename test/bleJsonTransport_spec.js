const assert = require('assert');
const sinon = require('sinon');
const BleJsonTransport = require('../core/bleJsonTransport');

describe('BleJsonTransport', function () {
    let transport;

    beforeEach(function () {
        transport = new BleJsonTransport();
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('chunkStream', function () {
        it('should accumulate chunks until newline is received', function () {
            const onComplete = sinon.spy();
            const onError = sinon.spy();
            const appendChunk = transport.chunkStream('service1', 'char1', onComplete, onError);

            // Send partial JSON
            appendChunk('{"test":');
            assert(!onComplete.called, 'Should not complete without newline');
            assert(!onError.called, 'Should not error on partial JSON');

            // Send rest of JSON with newline
            appendChunk('"value"}\n');
            assert(onComplete.called, 'Should complete when newline is received');
            assert(onComplete.calledWith({ test: 'value' }), 'Should parse complete JSON');
            assert(!onError.called, 'Should not error on valid JSON');
        });

        it('should handle multiple chunks correctly', function () {
            const onComplete = sinon.spy();
            const onError = sinon.spy();
            const appendChunk = transport.chunkStream('service1', 'char1', onComplete, onError);

            appendChunk('{"test"');
            appendChunk(':"value"');
            appendChunk('}\n');

            assert(onComplete.calledOnce, 'Should complete once');
            assert(onComplete.calledWith({ test: 'value' }), 'Should parse complete JSON');
            assert(!onError.called, 'Should not error on valid JSON');
        });

        it('should handle malformed JSON', function () {
            const onComplete = sinon.spy();
            const onError = sinon.spy();
            const appendChunk = transport.chunkStream('service1', 'char1', onComplete, onError);

            appendChunk('{"test":"value"\n'); // Missing closing brace

            assert(!onComplete.called, 'Should not complete with invalid JSON');
            assert(onError.called, 'Should call error handler for invalid JSON');
            assert(onError.args[0][0].includes('malformed'), 'Error message should mention malformed JSON');
        });

        it('should handle multiple streams independently', function () {
            const onComplete1 = sinon.spy();
            const onComplete2 = sinon.spy();
            const onError = sinon.spy();

            const appendChunk1 = transport.chunkStream('service1', 'char1', onComplete1, onError);
            const appendChunk2 = transport.chunkStream('service2', 'char2', onComplete2, onError);

            appendChunk1('{"stream":1');
            appendChunk2('{"stream":2');
            appendChunk1('}\n');
            appendChunk2('}\n');

            assert(onComplete1.calledWith({ stream: 1 }), 'Stream 1 should complete correctly');
            assert(onComplete2.calledWith({ stream: 2 }), 'Stream 2 should complete correctly');
            assert(!onError.called, 'Should not error on valid JSON');
        });

        it('should clean up chunks after completion', function () {
            const onComplete = sinon.spy();
            const onError = sinon.spy();
            const appendChunk = transport.chunkStream('service1', 'char1', onComplete, onError);

            appendChunk('{"test":"value"}\n');
            assert.strictEqual(transport.chunks.size, 0, 'Should clean up chunks after completion');
        });

        it('should clean up chunks after error', function () {
            const onComplete = sinon.spy();
            const onError = sinon.spy();
            const appendChunk = transport.chunkStream('service1', 'char1', onComplete, onError);

            appendChunk('{"test":invalid}\n');
            assert.strictEqual(transport.chunks.size, 0, 'Should clean up chunks after error');
        });
    });

    describe('chunkify', function () {
        it('should split data into chunks of correct size', function () {
            const data = { test: 'value'.repeat(10) }; // Create larger payload
            const chunks = [];
            
            transport.chunkify(data, function(chunk) {
                chunks.push(chunk);
            });

            // Verify chunks
            assert(chunks.length > 1, 'Should split into multiple chunks');
            chunks.forEach(function(chunk, i) {
                if (i < chunks.length - 1) {
                    assert(chunk.length <= 20, 'Chunk should not exceed max size');
                } else {
                    assert(chunk.toString().endsWith('\n'), 'Last chunk should end with newline');
                }
            });

            // Verify data can be reconstructed
            const fullData = chunks.map(c => c.toString()).join('');
            const parsed = JSON.parse(fullData);
            assert.deepStrictEqual(parsed, data, 'Data should be reconstructed correctly');
        });

        it('should handle small payloads in single chunk', function () {
            const data = { test: 'small' };
            const chunks = [];
            
            transport.chunkify(data, function(chunk) {
                chunks.push(chunk);
            });

            assert.strictEqual(chunks.length, 1, 'Small payload should fit in one chunk');
            assert(chunks[0].toString().endsWith('\n'), 'Chunk should end with newline');
            
            const parsed = JSON.parse(chunks[0].toString());
            assert.deepStrictEqual(parsed, data, 'Data should be parsed correctly');
        });

        it('should handle empty objects', function () {
            const data = {};
            const chunks = [];
            
            transport.chunkify(data, function(chunk) {
                chunks.push(chunk);
            });

            assert.strictEqual(chunks.length, 1, 'Empty object should be one chunk');
            assert.strictEqual(chunks[0].toString(), '{}\n', 'Should be properly formatted');
        });
    });
}); 