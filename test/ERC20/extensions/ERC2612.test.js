/* eslint-disable */
const { ethers   } = require('hardhat');
const chai         = require('chai');
const { solidity } = require('ethereum-waffle');
const { deploy   } = require('../../../scripts');
const { expect   } = chai;
chai.use(solidity);

const TYPES = {
  Permit: [
    { name: 'owner', type: 'address' },
    { name: 'spender', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
  ],
};

describe('ERC2612', function () {
  const accounts      = {};
  const name          = 'My Token';
  const symbol        = 'MTKN';
  const version       = '1';
  const domain        = {};
  const initialSupply = ethers.utils.parseEther('100');

  beforeEach(async function () {
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
    this.token = await deploy('ERC20Mock', [ name, symbol ]);
    await expect(this.token.mint(accounts.holder.address, initialSupply))
    .to.emit(this.token, 'Transfer').withArgs(ethers.constants.AddressZero, accounts.holder.address, initialSupply);

    domain.name              = name;
    domain.version           = version;
    domain.chainId           = await await ethers.provider.getNetwork().then(({ chainId }) => chainId);
    domain.verifyingContract = this.token.address;

    // Snapshot
    __SNAPSHOT_ID__ = await ethers.provider.send('evm_snapshot');
  });

  it('initial nonce is 0', async function () {
    expect(await this.token.nonces(accounts.holder.address)).to.be.equal('0');
  });

  it('domain separator', async function () {
    expect(await this.token.DOMAIN_SEPARATOR()).to.equal(ethers.utils._TypedDataEncoder.hashDomain(domain));
  });

  describe('permit', function () {
    it('accepts owner signature', async function () {
      expect(await this.token.nonces(accounts.holder.address)).to.be.equal(0);

      const message = {
        owner:    accounts.holder.address,
        spender:  accounts.spender.address,
        value:    42,
        nonce:    0,
        deadline: ethers.constants.MaxUint256,
      };

      const { v, r, s } = await accounts.holder._signTypedData(domain, TYPES, message).then(ethers.utils.splitSignature);

      expect(await this.token.permit(message.owner, message.spender, message.value, message.deadline, v, r, s))
      .to.emit(this.token, 'Approval').withArgs(message.owner, message.spender, message.value);

      expect(await this.token.nonces(accounts.holder.address)).to.be.equal(1);
      expect(await this.token.allowance(message.owner, message.spender)).to.be.equal(message.value);
    });

    it('rejects reused signature', async function () {
      const message = {
        owner:    accounts.holder.address,
        spender:  accounts.spender.address,
        value:    42,
        nonce:    0,
        deadline: ethers.constants.MaxUint256,
      };

      const { v, r, s } = await accounts.holder._signTypedData(domain, TYPES, message).then(ethers.utils.splitSignature);

      expect(await this.token.permit(message.owner, message.spender, message.value, message.deadline, v, r, s))
      .to.emit(this.token, 'Approval').withArgs(message.owner, message.spender, message.value);

      await expect(this.token.permit(message.owner, message.spender, message.value, message.deadline, v, r, s))
      .to.be.revertedWith('ERC20Permit: invalid signature');
    });

    it('rejects other signature', async function () {
      const message = {
        owner:    accounts.holder.address,
        spender:  accounts.spender.address,
        value:    42,
        nonce:    0,
        deadline: ethers.constants.MaxUint256,
      };

      // other signature
      const { v, r, s } = await accounts.other._signTypedData(domain, TYPES, message).then(ethers.utils.splitSignature);

      await expect(this.token.permit(message.owner, message.spender, message.value, message.deadline, v, r, s))
      .to.be.revertedWith('ERC20Permit: invalid signature');
    });

    it('rejects expired permit', async function () {
      const message = {
        owner:    accounts.holder.address,
        spender:  accounts.spender.address,
        value:    42,
        nonce:    0,
        deadline: await ethers.provider.getBlock('latest').then(({ timestamp }) => timestamp) - 1, // deadline passed
      };

      const { v, r, s } = await accounts.holder._signTypedData(domain, TYPES, message).then(ethers.utils.splitSignature);

      await expect(this.token.permit(message.owner, message.spender, message.value, message.deadline, v, r, s))
      .to.be.revertedWith('ERC20Permit: expired deadline');
    });
  });
});
