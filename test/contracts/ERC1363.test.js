const { ethers } = require('hardhat');
const { expect } = require('chai');
const { deploy } = require('../../scripts');

describe('ERC1363', function () {
  const accounts      = {};
  const name          = 'My Token';
  const symbol        = 'MTKN';
  const initialSupply = ethers.parseEther('100');
  const value         = ethers.parseEther('1');

  before(async function () {
    // Set accounts
    await ethers.getSigners().then(([
      holder,
      spender,
      other,
      ...signers
    ]) => Object.assign(
      accounts,
      { holder, spender, other },
      signers
    ));

    // Deploy mock contract
    this.token = await deploy('ERC1363Mock', [ name, symbol ]);

    await expect(this.token.mint(accounts.holder.address, initialSupply))
    .to.emit(this.token, 'Transfer').withArgs(ethers.ZeroAddress, accounts.holder.address, initialSupply);

    this.receiver = await deploy('ERC1363ReceiverMock');

    // Snapshot
    __SNAPSHOT_ID__ = await ethers.provider.send('evm_snapshot');
  });

  beforeEach(async function() {
    // Reset snapshot
    await ethers.provider.send('evm_revert', [ __SNAPSHOT_ID__ ])
    __SNAPSHOT_ID__ = await ethers.provider.send('evm_snapshot');
  });

  describe('transferAndCall', function () {
    it('without data', async function () {
      const data = '0x';

      await expect(this.token.connect(accounts.holder).getFunction('transferAndCall(address,uint256)')(this.receiver.target, value))
      .to.emit(this.token, 'Transfer').withArgs(accounts.holder.address, this.receiver.target, value)
      .to.emit(this.receiver, 'TransferReceived').withArgs(accounts.holder.address, accounts.holder.address, value, data);
    });

    it('with data', async function () {
      const data = '0x123456';

      await expect(this.token.connect(accounts.holder).getFunction('transferAndCall(address,uint256,bytes)')(this.receiver.target, value, data))
      .to.emit(this.token, 'Transfer').withArgs(accounts.holder.address, this.receiver.target, value)
      .to.emit(this.receiver, 'TransferReceived').withArgs(accounts.holder.address, accounts.holder.address, value, data);
    });

    it('with reverting hook (with reason)', async function () {
      const data = '0x00';

      await expect(this.token.connect(accounts.holder).getFunction('transferAndCall(address,uint256,bytes)')(this.receiver.target, value, data))
      .to.be.revertedWith('onTransferReceived revert');
    });

    it('with reverting hook (without reason)', async function () {
      const data = '0x01';

      await expect(this.token.connect(accounts.holder).getFunction('transferAndCall(address,uint256,bytes)')(this.receiver.target, value, data))
      .to.be.revertedWith('ERC1363: onTransferReceived reverted without reason');
    });

    it('with bad return value', async function () {
      const data = '0x02';

      await expect(this.token.connect(accounts.holder).getFunction('transferAndCall(address,uint256,bytes)')(this.receiver.target, value, data))
      .to.be.revertedWith('ERC1363: onTransferReceived invalid result');
    });
  });

  describe('transferFromAndCall', function () {
    beforeEach(async function () {
      await this.token.connect(accounts.holder).approve(accounts.other.address, ethers.MaxUint256);
    });

    it('without data', async function () {
      const data = '0x';

      await expect(this.token.connect(accounts.other).getFunction('transferFromAndCall(address,address,uint256)')(accounts.holder.address, this.receiver.target, value))
      .to.emit(this.token, 'Transfer').withArgs(accounts.holder.address, this.receiver.target, value)
      .to.emit(this.receiver, 'TransferReceived').withArgs(accounts.other.address, accounts.holder.address, value, data);
    });

    it('with data', async function () {
      const data = '0x123456';

      await expect(this.token.connect(accounts.other).getFunction('transferFromAndCall(address,address,uint256,bytes)')(accounts.holder.address, this.receiver.target, value, data))
      .to.emit(this.token, 'Transfer').withArgs(accounts.holder.address, this.receiver.target, value)
      .to.emit(this.receiver, 'TransferReceived').withArgs(accounts.other.address, accounts.holder.address, value, data);
    });

    it('with reverting hook (with reason)', async function () {
      const data = '0x00';

      await expect(this.token.connect(accounts.other).getFunction('transferFromAndCall(address,address,uint256,bytes)')(accounts.holder.address, this.receiver.target, value, data))
      .to.be.revertedWith('onTransferReceived revert');
    });

    it('with reverting hook (without reason)', async function () {
      const data = '0x01';

      await expect(this.token.connect(accounts.other).getFunction('transferFromAndCall(address,address,uint256,bytes)')(accounts.holder.address, this.receiver.target, value, data))
      .to.be.revertedWith('ERC1363: onTransferReceived reverted without reason');
    });

    it('with bad return value', async function () {
      const data = '0x02';

      await expect(this.token.connect(accounts.other).getFunction('transferFromAndCall(address,address,uint256,bytes)')(accounts.holder.address, this.receiver.target, value, data))
      .to.be.revertedWith('ERC1363: onTransferReceived invalid result');
    });
  });

  describe('approveAndCall', function () {
    it('without data', async function () {
      const data = '0x';

      await expect(this.token.connect(accounts.holder).getFunction('approveAndCall(address,uint256)')(this.receiver.target, value))
      .to.emit(this.token, 'Approval').withArgs(accounts.holder.address, this.receiver.target, value)
      .to.emit(this.receiver, 'ApprovalReceived').withArgs(accounts.holder.address, value, data);
    });

    it('with data', async function () {
      const data = '0x123456';

      await expect(this.token.connect(accounts.holder).getFunction('approveAndCall(address,uint256,bytes)')(this.receiver.target, value, data))
      .to.emit(this.token, 'Approval').withArgs(accounts.holder.address, this.receiver.target, value)
      .to.emit(this.receiver, 'ApprovalReceived').withArgs(accounts.holder.address, value, data);
    });

    it('with reverting hook (with reason)', async function () {
      const data = '0x00';

      await expect(this.token.connect(accounts.holder).getFunction('approveAndCall(address,uint256,bytes)')(this.receiver.target, value, data))
      .to.be.revertedWith('onApprovalReceived revert');
    });

    it('with reverting hook (without reason)', async function () {
      const data = '0x01';

      await expect(this.token.connect(accounts.holder).getFunction('approveAndCall(address,uint256,bytes)')(this.receiver.target, value, data))
      .to.be.revertedWith('ERC1363: onApprovalReceived reverted without reason');
    });

    it('with bad return value', async function () {
      const data = '0x02';

      await expect(this.token.connect(accounts.holder).getFunction('approveAndCall(address,uint256,bytes)')(this.receiver.target, value, data))
      .to.be.revertedWith('ERC1363: onApprovalReceived invalid result');
    });
  });
});
