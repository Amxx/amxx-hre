const { ethers } = require('ethers');
const prompts    = require('prompts');
const AsyncConf  = require("./AsyncConf");

function confirm(message = 'Confirm') {
    return prompts({ type: 'confirm', name: 'confirm', message }).then(({ confirm }) => confirm);
}

class MigrationManager {
    constructor(provider, config = {}) {
        this.provider = provider;
        this.config   = config;

        this.cacheAsPromise = provider.getNetwork().then(({ name, chainId }) => {
            this.cache = new AsyncConf({ cwd: config.cwd ?? '.', configName: `.cache-${chainId}` });
            return this.cache;
        });
    }

    ready() {
        return Promise.all([
            this.cacheAsPromise,
        ])
        .then(() => this);
    }

    migrate(key, factory, args = [], opts = {}) {
        if (!Array.isArray(args)) {
            opts = args;
            args = [];
        }
        return this.ready()
            .then(() => opts.noCache && (
                this.cache.delete(key) || this.cache.delete(`${key}-pending`)
            ))
            .then(() => opts.noConfirm || (
                this.cache.get(key).then(value => !!value || confirm(`Deploy "${key}" with params:\n${JSON.stringify(args, null, 4)}\nConfirm`))
            ))
            // fetchOrDeploy
            .then(deploy => deploy
                ? Promise.resolve(factory)
                    .then(contract =>
                        this.resumeOrDeploy(key, () => opts.kind
                            ? upgrades.deployProxy(contract, args, opts)
                            : contract.deploy(...args)
                        )
                        .then(address => contract.attach(address))
                    )
                : undefined
            );
    }

    async resumeOrDeploy(key, deploy) {
        let txHash  = await this.cache.get(`${key}-pending`);
        let address = await this.cache.get(key);

        if (!txHash && !address) {
            const contract = await deploy();
            txHash = contract.deployTransaction.hash;
            await this.cache.set(`${key}-pending`, txHash);
            await contract.deployed();
            address = contract.address;
            await this.cache.set(key, address);
        } else if (!address) {
            address = await this.provider.getTransaction(txHash)
            .then(tx => tx.wait())
            .then(receipt => receipt.contractAddress);
            await this.cache.set(key, address);
        }
        return address;
    }
}

module.exports = MigrationManager;