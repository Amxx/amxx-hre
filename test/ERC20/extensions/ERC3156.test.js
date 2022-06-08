/* eslint-disable */
const { ethers   } = require('hardhat');
const chai         = require('chai');
const { solidity } = require('ethereum-waffle');
const { deploy   } = require('../../../scripts');
const { expect   } = chai;
chai.use(solidity);

describe('ERC3156', function () {
  const accounts      = {};
  const name          = 'My Token';
  const symbol        = 'MTKN';
  const initialSupply = ethers.utils.parseEther('100');
  const loanAmount    = ethers.utils.parseEther('10000000000000');

  before(async function () {
    // Set accounts
    await ethers.getSigners().then(([
      holder,
      recipient,
      other,
      ...signers
    ]) => Object.assign(
      accounts,
      { holder, recipient, other },
      signers
    ));

    // Deploy mock contract
    this.token = await deploy('ERC20Mock', [ name, symbol ]);
    await expect(this.token.mint(accounts.holder.address, initialSupply))
    .to.emit(this.token, 'Transfer').withArgs(ethers.constants.AddressZero, accounts.holder.address, initialSupply);

    // Snapshot
    __SNAPSHOT_ID__ = await ethers.provider.send('evm_snapshot');
  });

  beforeEach(async function() {
    // Reset snapshot
    await ethers.provider.send('evm_revert', [ __SNAPSHOT_ID__ ])
    __SNAPSHOT_ID__ = await ethers.provider.send('evm_snapshot');
  });

  describe('maxFlashLoan', function () {
    it('token match', async function () {
      expect(await this.token.maxFlashLoan(this.token.address))
      .to.be.equal(ethers.constants.MaxUint256.sub(initialSupply));
    });

    it('token mismatch', async function () {
      expect(await this.token.maxFlashLoan(ethers.constants.AddressZero)).to.be.equal(0);
    });
  });

  describe('flashFee', function () {
    it('token match', async function () {
      expect(await this.token.flashFee(this.token.address, loanAmount)).to.be.equal(0);
    });

    it('token mismatch', async function () {
      await expect(this.token.flashFee(ethers.constants.AddressZero, loanAmount))
      .to.be.revertedWith('wrong token');
    });
  });

  describe('flashLoan', function () {
    it('success', async function () {
      const receiver = await deploy('ERC3156FlashBorrowerMock', [ true, true ]);

      expect(await this.token.flashLoan(receiver.address, this.token.address, loanAmount, '0x'))
      .to.emit(this.token, 'Transfer'   ).withArgs(ethers.constants.AddressZero, receiver.address,             loanAmount)
      .to.emit(this.token, 'Transfer'   ).withArgs(receiver.address,             ethers.constants.AddressZero, loanAmount)
      .to.emit(receiver,   'BalanceOf'  ).withArgs(this.token.address,           receiver.address,             loanAmount)
      .to.emit(receiver,   'TotalSupply').withArgs(this.token.address, initialSupply.add(loanAmount) )

      expect(await this.token.totalSupply()).to.be.equal(initialSupply);
      expect(await this.token.balanceOf(receiver.address)).to.be.equal(0);
      expect(await this.token.allowance(receiver.address, this.token.address)).to.be.equal(0);
    });

    it ('missing return value', async function () {
      const receiver = await deploy('ERC3156FlashBorrowerMock', [ false, true ]);

      await expect(this.token.flashLoan(receiver.address, this.token.address, loanAmount, '0x'))
      .to.be.revertedWith('invalid return value');
    });

    it ('missing approval', async function () {
      const receiver = await deploy('ERC3156FlashBorrowerMock', [ true, false ]);

      await expect(this.token.flashLoan(receiver.address, this.token.address, loanAmount, '0x'))
      .to.be.revertedWith('insufficient allowance');
    });

    it ('unavailable funds', async function () {
      const receiver = await deploy('ERC3156FlashBorrowerMock', [ true, true ]);

      const data = this.token.interface.encodeFunctionData('transfer(address,uint256)', [ accounts.other.address, 10 ]);
      await expect(this.token.flashLoan(receiver.address, this.token.address, loanAmount, data))
      .to.be.revertedWith('burn amount exceeds balance');
    });

    it ('more than maxFlashLoan', async function () {
      const receiver = await deploy('ERC3156FlashBorrowerMock', [ true, true ]);

      const data = this.token.interface.encodeFunctionData('transfer(address,uint256)', [ accounts.other.address, 10 ]);
      await expect(this.token.flashLoan(receiver.address, this.token.address, ethers.constants.MaxInt256, data))
      .to.be.reverted;
    });
  });
});
