const { ethers, upgrades } = require('hardhat');

Array.range = function(start, stop = undefined, step = 1) {
    if (!stop) { stop = start; start = 0; }
    return start < stop ? Array(Math.ceil((stop - start) / step)).fill().map((_, i) => start + i * step) : [];
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

async function getFactory(name, opts = {}) {
    return ethers.getContractFactory(name).then(contract => contract.connect(opts.signer || contract.signer));
}

function attach(name, address, opts = {}) {
    return getFactory(name, opts).then(factory => factory.attach(address));
}

function deploy(name, args = [], opts = {}) {
    if (!Array.isArray(args)) { opts = args; args = []; }
    return getFactory(name, opts).then(factory => factory.deploy(...args)).then(contract => contract.deployed());
}

function deployUpgradeable(name, kind, args = [], opts = {}) {
    if (!Array.isArray(args)) { opts = args; args = []; }
    return getFactory(name, opts).then(factory => upgrades.deployProxy(factory, args, { kind })).then(contract => contract.deployed());
}

function performUpgrade(proxy, name, opts = {}) {
    return getFactory(name, opts).then(factory => upgrades.upgradeProxy(proxy.address, factory, {}));
}

module.exports = {
    getFactory,
    attach,
    deploy,
    deployUpgradeable,
    performUpgrade,
};