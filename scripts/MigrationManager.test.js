const { ethers } = require('ethers');
const MigrationManager = require('./MigrationManager');

(async () => {
    const { abi, bytecode } = require('../artifacts/contracts/mocks/ERC721VotesMock.sol/ERC721VotesMock.json');

    const provider = ethers.getDefaultProvider('http://127.0.0.1:8545/');
    const signer   = ethers.Wallet.fromMnemonic('test test test test test test test test test test test junk').connect(provider);
    const factory  = new ethers.ContractFactory(abi, bytecode, signer);

    const manager = new MigrationManager(provider);
    const deployed = await manager.migrate(
        'test',
        factory,
        [ "name", "symbol" ],
        {},
    );
    console.log(deployed.address);

})().catch(console.error);
