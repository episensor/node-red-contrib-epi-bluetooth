var MAX_CHUNK_SIZE = 20; //bytes

var BleJsonTransport = function() {
    this.chunks = new Map();
};

BleJsonTransport.prototype.chunkStream = function(serviceId, charId, onComplete, onError) {
    var _this = this;

    return function appendChunk(data) {
        var key = serviceId + '_' + charId;
        if (!_this.chunks.has(key)) {
            _this.chunks.set(key, '');
        }
        
        var lastData = _this.chunks.get(key);
        var data = lastData + data.toString();

        if (data[data.length - 1] === '\n') {
            var result;

            try {
                result = JSON.parse(data);
                _this.chunks.delete(key); // Clear the chunks for this key
                onComplete(result);
            } catch (exc) {
                _this.chunks.delete(key); // Clear the chunks for this key on error
                onError('chunkStream: The received payload seems to be malformed: ' + exc.message);
                return false;
            }
            
            return true;
        } else {
            _this.chunks.set(key, data);
            return true;
        }
    }
};

BleJsonTransport.prototype.chunkify = function(data, chunkIterator) {
    var terminatedJson = JSON.stringify(data) + '\n';
    var totalChunks = Math.ceil(terminatedJson.length / MAX_CHUNK_SIZE);

    for (var i = 0; i < totalChunks; i++) {
        var chunk = terminatedJson.substr(i * MAX_CHUNK_SIZE, MAX_CHUNK_SIZE);
        var chunkBuffer = Buffer.from(chunk, 'utf-8');

        chunkIterator(chunkBuffer);
    }
}

module.exports = BleJsonTransport;
