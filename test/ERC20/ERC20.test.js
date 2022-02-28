const { ethers   } = require('hardhat');
const chai         = require('chai');
const { solidity } = require('ethereum-waffle');
const { deploy   } = require('../../scripts');
const { expect   } = chai;
chai.use(solidity);


const {
  shouldBehaveLikeERC20,
  shouldBehaveLikeERC20Transfer,
  shouldBehaveLikeERC20Approve,
} = require('./ERC20.behavior');


describe('ERC20', function () {
  const accounts      = {};
  const name          = 'My Token';
  const symbol        = 'MTKN';
  const initialSupply = ethers.utils.parseEther('100');

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

  it('has a name', async function () {
    expect(await this.token.name()).to.equal(name);
  });

  it('has a symbol', async function () {
    expect(await this.token.symbol()).to.equal(symbol);
  });

  it('has 18 decimals', async function () {
    expect(await this.token.decimals()).to.be.equal(18);
  });

  shouldBehaveLikeERC20(initialSupply, accounts);

  describe('_transfer', function () {
    shouldBehaveLikeERC20Transfer(
      initialSupply,
      accounts,
      function (from, to, amount) {
        return this.token.transferInternal(from.address, to.address, amount);
      },
    );

    describe('when the sender is the zero address', function () {
      it('reverts', async function () {
        await expect(this.token.transferInternal(ethers.constants.AddressZero, accounts.recipient.address, initialSupply))
        .to.be.revertedWith('transfer from the zero address');
      });
    });
  });

  describe('_approve', function () {
    shouldBehaveLikeERC20Approve(
      initialSupply,
      accounts,
      function (owner, spender, amount) {
        return this.token.approveInternal(owner.address, spender.address, amount);
      },
    );

    describe('when the owner is the zero address', function () {
      it('reverts', async function () {
        await expect(this.token.approveInternal(ethers.constants.AddressZero, accounts.recipient.address, initialSupply))
        .to.be.revertedWith('approve from the zero address');
      });
    });
  });

  describe('_mint', function () {
    const amount = ethers.BigNumber.from(50);

    it('rejects a null account', async function () {
      await expect(this.token.mint(ethers.constants.AddressZero, amount))
      .to.be.revertedWith('mint to the zero address');
    });

    describe('for a non zero account', function () {
      beforeEach('minting', async function () {
        this.receipt = await this.token.mint(accounts.recipient.address, amount);
      });

      it('increments totalSupply', async function () {
        expect(await this.token.totalSupply()).to.be.equal(initialSupply.add(amount));
      });

      it('increments recipient balance', async function () {
        expect(await this.token.balanceOf(accounts.recipient.address)).to.be.equal(amount);
      });

      it('emits Transfer event', async function () {
        expect(this.receipt)
        .to.emit(this.token, 'Transfer').withArgs(ethers.constants.AddressZero, accounts.recipient.address, amount);
      });
    });
  });

  describe('_burn', function () {
    it('rejects a null account', async function () {
      await expect(this.token.burn(ethers.constants.AddressZero, 1))
      .to.be.revertedWith('burn from the zero address');
    });

    describe('for a non zero account', function () {
      it('rejects burning more than balance', async function () {
        await expect(this.token.burn(accounts.holder.address, initialSupply.add(1)))
        .to.be.revertedWith('burn amount exceeds balance');
      });

      const describeBurn = function (description, amount) {
        describe(description, function () {
          beforeEach('burning', async function () {
            this.receipt = await this.token.burn(accounts.holder.address, amount);
          });

          it('decrements totalSupply', async function () {
            expect(await this.token.totalSupply()).to.be.equal(initialSupply.sub(amount));
          });

          it('decrements initialHolder balance', async function () {
            expect(await this.token.balanceOf(accounts.holder.address)).to.be.equal(initialSupply.sub(amount));
          });

          it('emits Transfer event', async function () {
            expect(this.receipt)
            .to.emit(this.token, 'Transfer').withArgs(accounts.holder.address, ethers.constants.AddressZero, amount);
          });
        });
      };

      describeBurn('for entire balance', initialSupply);
      describeBurn('for less amount than balance', initialSupply.sub(1));
    });
  });
});
