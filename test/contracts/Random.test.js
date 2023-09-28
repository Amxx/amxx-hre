const { expect } = require('chai');
const { deploy } = require('../../scripts');

describe('Random', function () {
    beforeEach(async function () {
        this.instance = await deploy('RandomMock');
    });

    it('draw from empty', async function () {
        await expect(this.instance.draw()).to.be.reverted;
    });

    it('put → draw (one)', async function () {
        await expect(this.instance.draw()).to.be.reverted;

        expect(await this.instance.remaining()).to.be.equal(0);

        await expect(this.instance.put(17n)).to.be.not.reverted;

        expect(await this.instance.remaining()).to.be.equal(1);

        await expect(this.instance.draw())
        .to.emit(this.instance, 'ReturnValue').withArgs(17n);

        expect(await this.instance.remaining()).to.be.equal(0);

        await expect(this.instance.draw()).to.be.reverted;
    });

    it('put → draw (multiple)', async function () {
        await expect(this.instance.draw()).to.be.reverted;

        expect(await this.instance.remaining()).to.be.equal(0);

        await expect(this.instance.put(17n)).to.be.not.reverted;
        await expect(this.instance.put(42n)).to.be.not.reverted;

        expect(await this.instance.remaining()).to.be.equal(2);

        expect(await Promise.all(Array(2).fill().map(_ => this.instance.draw()
            .then(tx      => tx.wait())
            .then(receipt => receipt.logs.find(event => event.eventName === 'ReturnValue'))
            .then(event   => event.args[0])
        ))).to.have.members([ 17n, 42n ]);

        expect(await this.instance.remaining()).to.be.equal(0);

        await expect(this.instance.draw()).to.be.reverted;
    });

    it('setup → draw', async function () {
        const values = Array.range(42).map(BigInt);

        await expect(this.instance.draw()).to.be.reverted;

        expect(await this.instance.remaining()).to.be.equal(0);

        await expect(this.instance.setup(values.length)).to.be.not.reverted;

        expect(await this.instance.remaining()).to.be.equal(values.length);

        await Promise.all(values.map(_ => this.instance.draw()
            .then(tx      => tx.wait())
            .then(receipt => receipt.logs.find(event => event.eventName === 'ReturnValue'))
            .then(event   => event.args[0])
        )).then(results => expect(results).to.have.members(values));

        expect(await this.instance.remaining()).to.be.equal(0);

        await expect(this.instance.draw()).to.be.reverted;
    });
});
