Array.range = function(start, stop = undefined, step = 1) {
    if (!stop) { stop = start; start = 0; }
    return start < stop ? Array(Math.ceil((stop - start) / step)).fill().map((_, i) => start + i * step) : [];
}

Array.zip = function (...args) {
    return Array(Math.max(...args.map(arg => arg.length))).fill(null).map((_, i) => args.map(arg => arg[i]));
}

Array.prototype.unique = function(op = x => x) {
    return this.filter((obj, i) => this.findIndex(entry => op(obj) === op(entry)) === i);
}

Array.prototype.chunk = function(size) {
    return Array.range(Math.ceil(this.length / size)).map(i => this.slice(i * size, i * size + size))
}

Buffer.prototype.chunk = function(size) {
    return Array.range(Math.ceil(this.length / size)).map(i => this.slice(i * size, i * size + size))
}
