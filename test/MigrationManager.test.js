const { ethers } = require("hardhat");
const { expect } = require("chai");

const MigrationManager = require('../scripts/MigrationManager');

describe("MigrationManager", function () {
    before(async function () {
        // signers
        this.accounts = await ethers.getSigners();
        this.admin    = this.accounts.shift();

        // manager
        this.manager  = new MigrationManager(this.admin.provider);

        // deployment function
        this.deploy = ({ contract = 'RandomMock', name = 'test', args = [], opts = {} }) =>
            ethers.getContractFactory(contract).then(factory => this.manager.migrate(name, factory, args, opts));
    });

    it("Should cache deployment address", async function () {
        const contracts = await this.deploy({ opts: { noCache: true, noConfirm: true }});
        expect(await this.manager.cache.get('test.address')).to.be.equal(await contracts.getAddress());
    });

    it("Do not redeploy", async function () {
        // initial deployment
        const contract1 = await this.deploy({ opts: { noCache: true, noConfirm: true }});

        // check cache
        expect(await this.manager.cache.get('test.address')).to.be.equal(await contract1.getAddress());

        // redeployment
        const contract2 = await this.deploy({ opts: { noConfirm: true }});

        // should be at the same address
        expect(await contract1.getAddress()).to.be.equal(await contract2.getAddress());

        // recheck cache
        expect(await this.manager.cache.get('test.address')).to.be.equal(await contract1.getAddress());
    });
});