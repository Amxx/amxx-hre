const AsyncConf  = require("./AsyncConf");
const prompts    = require('prompts');

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
                this.cache.delete(`${key}.address`) || this.cache.delete(`${key}.txHash`)
            ))
            .then(() => opts.noConfirm || (
                this.cache.get(`${key}.address`).then(value => !!value || confirm(`Deploy "${key}" with params:\n${JSON.stringify(args, null, 4)}\nConfirm`))
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
        let txHash  = await this.cache.get(`${key}.txHash`);
        let address = await this.cache.get(`${key}.address`);
        if (!txHash && !address) {
            const contract = await deploy();
            txHash = contract.deploymentTransaction().hash;
            await this.cache.set(`${key}.txHash`, txHash);
            await contract.waitForDeployment();
            address = await contract.getAddress();
            await this.cache.set(`${key}.address`, address);
        } else if (!address) {
            address = await this.provider.getTransaction(txHash)
            .then(tx => tx.wait())
            .then(receipt => receipt.contractAddress);
            await this.cache.set(`${key}.address`, address);
        }
        return address;
    }
}

module.exports = MigrationManager;