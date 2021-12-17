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
            this.cache = new AsyncConf({ configName: `.cache-${chainId}` });
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
        return this.ready()
            // confirm deployment (clean cache if needed)
            .then(() => opts.override
                ? this.cache.delete(key) || this.cache.delete(`${key}-pending`) || true
                : this.cache.get(key).then(value => !!value || confirm(`Deploy "${key}" with params:\n${JSON.stringify(args, null, 4)}\nConfirm`))
            )
            // fetchOrDeploy
            .then(deploy => deploy
                ? this.resumeOrDeploy(key, () => opts.kind
                    ? upgrades.deployProxy(factory, args, opts)
                    : factory.deploy(...args)
                )
                : undefined
            )
            // attach to address
            .then(address => address
                ? factory.attach(address)
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