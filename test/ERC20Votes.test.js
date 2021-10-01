const { ethers   } = require('hardhat');
const chai         = require('chai');
const { solidity } = require('ethereum-waffle');
const { deploy   } = require('../scripts');
const { expect   } = chai;
chai.use(solidity);

const TYPES = {
  Delegation: [
    { name: 'delegatee', type: 'address' },
    { name: 'nonce',     type: 'uint256' },
    { name: 'expiry',    type: 'uint256' },
  ],
};

describe('ERC20Votes', function () {
  const name    = 'My Token';
  const symbol  = 'MTKN';
  const version = '1';
  const supply  = ethers.utils.parseEther('1');

  beforeEach(async function () {
    this.accounts                    = await ethers.getSigners();
    this.accounts.holder             = this.accounts.shift();
    this.accounts.recipient          = this.accounts.shift();
    this.accounts.holderDelegatee    = this.accounts.shift();
    this.accounts.recipientDelegatee = this.accounts.shift();
    this.accounts.other1             = this.accounts.shift();
    this.accounts.other2             = this.accounts.shift();

    this.token = await deploy('ERC20VotesMock', [ name, symbol ]);
    this.domain = {
      name,
      version,
      chainId: await this.token.getChainId(),
      verifyingContract: this.token.address,
    };
  });

  it('initial nonce is 0', async function () {
    expect(await this.token.nonces(this.accounts.holder.address)).to.be.equal(0);
  });

  it('domain separator', async function () {
    expect(await this.token.DOMAIN_SEPARATOR())
    .to.equal(ethers.utils._TypedDataEncoder.hashDomain(this.domain));
  });

  // it('minting restriction', async function () {
  //   const amount = new BN('2').pow(new BN('224'));
  //   await expectRevert(
  //     this.token.mint(holder, amount),
  //     'ERC20Votes: total supply risks overflowing votes',
  //   );
  // });

  describe('set delegation', function () {
    describe('call', function () {
      it('delegation with balance', async function () {
        await this.token.mint(this.accounts.holder.address, supply);

        expect(await this.token.delegates(this.accounts.holder.address)).to.be.equal(ethers.constants.AddressZero);

        const tx = await this.token.connect(this.accounts.holder).delegate(this.accounts.holder.address);
        await expect(tx)
        .to.emit(this.token, 'DelegateChanged').withArgs(this.accounts.holder.address, ethers.constants.AddressZero, this.accounts.holder.address)
        .to.emit(this.token, 'DelegateVotesChanged').withArgs(this.accounts.holder.address, 0, supply);

        expect(await this.token.delegates(this.accounts.holder.address)).to.be.equal(this.accounts.holder.address);

        expect(await this.token.getVotes(this.accounts.holder.address)).to.be.equal(supply);
        expect(await this.token.getPastVotes(this.accounts.holder.address, tx.blockNumber - 1)).to.be.equal('0');
        await ethers.provider.send('evm_mine');
        expect(await this.token.getPastVotes(this.accounts.holder.address, tx.blockNumber)).to.be.equal(supply);
      });

      it('delegation without balance', async function () {
        expect(await this.token.delegates(this.accounts.holder.address)).to.be.equal(ethers.constants.AddressZero);

        await expect(this.token.connect(this.accounts.holder).delegate(this.accounts.holder.address))
        .to.emit(this.token, 'DelegateChanged').withArgs(this.accounts.holder.address, ethers.constants.AddressZero, this.accounts.holder.address)
        .to.not.emit(this.token, 'DelegateVotesChanged');

        expect(await this.token.delegates(this.accounts.holder.address)).to.be.equal(this.accounts.holder.address);
      });
    });

    describe('with signature', function () {
      beforeEach(async function () {
        await this.token.mint(this.accounts.holder.address, supply);

        this.data = {
          delegatee: this.accounts.holder.address,
          nonce:     0,
          expiry:    ethers.constants.MaxUint256,
        };
        this.sign = await this.accounts.holder._signTypedData(this.domain, TYPES, this.data).then(ethers.utils.splitSignature);
      });

      it('accept signed delegation', async function () {
        expect(await this.token.delegates(this.accounts.holder.address)).to.be.equal(ethers.constants.AddressZero);

        const tx = await this.token.delegateBySig(this.accounts.holder.address, this.data.nonce, this.data.expiry, this.sign.v, this.sign.r, this.sign.s);
        await expect(tx)
        .to.emit(this.token, 'DelegateChanged').withArgs(this.accounts.holder.address, ethers.constants.AddressZero, this.accounts.holder.address)
        .to.emit(this.token, 'DelegateVotesChanged').withArgs(this.accounts.holder.address, 0, supply);

        expect(await this.token.delegates(this.accounts.holder.address)).to.be.equal(this.accounts.holder.address);

        expect(await this.token.getVotes(this.accounts.holder.address)).to.be.equal(supply);
        expect(await this.token.getPastVotes(this.accounts.holder.address, tx.blockNumber - 1)).to.be.equal('0');
        await ethers.provider.send('evm_mine');
        expect(await this.token.getPastVotes(this.accounts.holder.address, tx.blockNumber)).to.be.equal(supply);
      });

      it('rejects reused signature', async function () {
        await expect(this.token.delegateBySig(this.accounts.holder.address, this.data.nonce, this.data.expiry, this.sign.v, this.sign.r, this.sign.s)).to.be.not.reverted;
        await expect(this.token.delegateBySig(this.accounts.holder.address, this.data.nonce, this.data.expiry, this.sign.v, this.sign.r, this.sign.s)).to.be.revertedWith("invalid nonce");
      });

      it('rejects bad delegatee', async function () {
        const tx = await this.token.delegateBySig(this.accounts.holderDelegatee.address, this.data.nonce, this.data.expiry, this.sign.v, this.sign.r, this.sign.s);
        await expect(tx)
        .to.emit(this.token, 'DelegateChanged');

        const { args } = await tx.wait().then(receipt => receipt.events.find(({ event }) => event == 'DelegateChanged'));
        expect(args.delegator).to.not.be.equal(this.accounts.holder.address);
        expect(args.fromDelegate).to.be.equal(ethers.constants.AddressZero);
        expect(args.toDelegate).to.be.equal(this.accounts.holderDelegatee.address);
      });

      it('rejects bad nonce', async function () {
        await expect(this.token.delegateBySig(this.accounts.holder.address, this.data.nonce + 1, this.data.expiry, this.sign.v, this.sign.r, this.sign.s)).to.be.revertedWith("invalid nonce");
      });

      it('rejects expired permit', async function () {
        const expiry = await ethers.provider.getBlock().then(({ timestamp }) => timestamp - 1);

        this.data = {
          delegatee: this.accounts.holder.address,
          nonce:     0,
          expiry,
        };
        this.sign = await this.accounts.holder._signTypedData(this.domain, TYPES, this.data).then(ethers.utils.splitSignature);

        await expect(this.token.delegateBySig(this.accounts.holder.address, this.data.nonce, this.data.expiry, this.sign.v, this.sign.r, this.sign.s)).to.be.revertedWith("signature expired");
      });
    });
  });

  describe('change delegation', function () {
    beforeEach(async function () {
      await this.token.mint(this.accounts.holder.address, supply);
      await this.token.connect(this.accounts.holder).delegate(this.accounts.holder.address);
    });

    it('call', async function () {
      expect(await this.token.delegates(this.accounts.holder.address)).to.be.equal(this.accounts.holder.address);

      const tx = await this.token.connect(this.accounts.holder).delegate(this.accounts.holderDelegatee.address);
      await expect(tx)
      .to.emit(this.token, 'DelegateChanged').withArgs(this.accounts.holder.address, this.accounts.holder.address, this.accounts.holderDelegatee.address)
      .to.emit(this.token, 'DelegateVotesChanged').withArgs(this.accounts.holder.address, supply, 0)
      .to.emit(this.token, 'DelegateVotesChanged').withArgs(this.accounts.holderDelegatee.address, 0, supply);

      expect(await this.token.delegates(this.accounts.holder.address)).to.be.equal(this.accounts.holderDelegatee.address);

      expect(await this.token.getVotes(this.accounts.holder.address)).to.be.equal(0);
      expect(await this.token.getVotes(this.accounts.holderDelegatee.address)).to.be.equal(supply);
      expect(await this.token.getPastVotes(this.accounts.holder.address, tx.blockNumber - 1)).to.be.equal(supply);
      expect(await this.token.getPastVotes(this.accounts.holderDelegatee.address, tx.blockNumber - 1)).to.be.equal(0);
      await ethers.provider.send('evm_mine');
      expect(await this.token.getPastVotes(this.accounts.holder.address, tx.blockNumber)).to.be.equal(0);
      expect(await this.token.getPastVotes(this.accounts.holderDelegatee.address, tx.blockNumber)).to.be.equal(supply);
    });
  });

  describe.only('transfers', function () {
    beforeEach(async function () {
      await this.token.mint(this.accounts.holder.address, supply);
    });

    it('no delegation', async function () {
      await expect(this.token.connect(this.accounts.holder).transfer(this.accounts.recipient.address, 1))
      .to.emit(this.token, 'Transfer').withArgs(this.accounts.holder.address, this.accounts.recipient.address, 1)
      .to.not.emit(this.token, 'DelegateVotesChanged');

      this.holderVotes    = 0;
      this.recipientVotes = 0;
    });

    it('sender delegation', async function () {
      await this.token.connect(this.accounts.holder).delegate(this.accounts.holder.address);

      const tx = await this.token.connect(this.accounts.holder).transfer(this.accounts.recipient.address, 1);
      await expect(tx)
      .to.emit(this.token, 'Transfer').withArgs(this.accounts.holder.address, this.accounts.recipient.address, 1)
      .to.emit(this.token, 'DelegateVotesChanged').withArgs(this.accounts.holder.address, supply, supply.sub(1));

      const { events } = await tx.wait();
      const { logIndex: transferLogIndex } = events.find(({ event }) => event == 'Transfer');
      expect(events.filter(({ event }) => event == 'DelegateVotesChanged').every(({ logIndex }) => transferLogIndex < logIndex)).to.be.equal(true);

      this.holderVotes    = supply.sub(1);
      this.recipientVotes = 0;
    });

    it('receiver delegation', async function () {
      await this.token.connect(this.accounts.recipient).delegate(this.accounts.recipient.address);

      const tx = await this.token.connect(this.accounts.holder).transfer(this.accounts.recipient.address, 1);
      await expect(tx)
      .to.emit(this.token, 'Transfer').withArgs(this.accounts.holder.address, this.accounts.recipient.address, 1)
      .to.emit(this.token, 'DelegateVotesChanged').withArgs(this.accounts.recipient.address, 0, 1);

      const { events } = await tx.wait();
      const { logIndex: transferLogIndex } = events.find(({ event }) => event == 'Transfer');
      expect(events.filter(({ event }) => event == 'DelegateVotesChanged').every(({ logIndex }) => transferLogIndex < logIndex)).to.be.equal(true);

      this.holderVotes    = 0;
      this.recipientVotes = 1;
    });

    it('full delegation', async function () {
      await this.token.connect(this.accounts.holder).delegate(this.accounts.holder.address);
      await this.token.connect(this.accounts.recipient).delegate(this.accounts.recipient.address);

      const tx = await this.token.connect(this.accounts.holder).transfer(this.accounts.recipient.address, 1);
      await expect(tx)
      .to.emit(this.token, 'Transfer').withArgs(this.accounts.holder.address, this.accounts.recipient.address, 1)
      .to.emit(this.token, 'DelegateVotesChanged').withArgs(this.accounts.holder.address, supply, supply.sub(1))
      .to.emit(this.token, 'DelegateVotesChanged').withArgs(this.accounts.recipient.address, 0, 1);

      const { events } = await tx.wait();
      const { logIndex: transferLogIndex } = events.find(({ event }) => event == 'Transfer');
      expect(events.filter(({ event }) => event == 'DelegateVotesChanged').every(({ logIndex }) => transferLogIndex < logIndex)).to.be.equal(true);

      this.holderVotes    = supply.sub(1);
      this.recipientVotes = 1;
    });

    afterEach(async function () {
      expect(await this.token.getVotes(this.accounts.holder.address)).to.be.equal(this.holderVotes);
      expect(await this.token.getVotes(this.accounts.recipient.address)).to.be.equal(this.recipientVotes);

      // need to advance 2 blocks to see the effect of a transfer on "getPastVotes"
      const block = await ethers.provider.getBlock();
      await ethers.provider.send('evm_mine');

      expect(await this.token.getPastVotes(this.accounts.holder.address,    block.number)).to.be.equal(this.holderVotes);
      expect(await this.token.getPastVotes(this.accounts.recipient.address, block.number)).to.be.equal(this.recipientVotes);
    });
  });

  // // The following tests are a adaptation of https://github.com/compound-finance/compound-protocol/blob/master/tests/Governance/CompTest.js.
  // describe('Compound test suite', function () {
  //   beforeEach(async function () {
  //     await this.token.mint(holder, supply);
  //   });

  //   describe('balanceOf', function () {
  //     it('grants to initial account', async function () {
  //       expect(await this.token.balanceOf(holder)).to.be.bignumber.equal('10000000000000000000000000');
  //     });
  //   });

  //   describe('numCheckpoints', function () {
  //     it('returns the number of checkpoints for a delegate', async function () {
  //       await this.token.transfer(recipient, '100', { from: holder }); //give an account a few tokens for readability
  //       expect(await this.token.numCheckpoints(other1)).to.be.bignumber.equal('0');

  //       const t1 = await this.token.delegate(other1, { from: recipient });
  //       expect(await this.token.numCheckpoints(other1)).to.be.bignumber.equal('1');

  //       const t2 = await this.token.transfer(other2, 10, { from: recipient });
  //       expect(await this.token.numCheckpoints(other1)).to.be.bignumber.equal('2');

  //       const t3 = await this.token.transfer(other2, 10, { from: recipient });
  //       expect(await this.token.numCheckpoints(other1)).to.be.bignumber.equal('3');

  //       const t4 = await this.token.transfer(recipient, 20, { from: holder });
  //       expect(await this.token.numCheckpoints(other1)).to.be.bignumber.equal('4');

  //       expect(await this.token.checkpoints(other1, 0)).to.be.deep.equal([ t1.receipt.blockNumber.toString(), '100' ]);
  //       expect(await this.token.checkpoints(other1, 1)).to.be.deep.equal([ t2.receipt.blockNumber.toString(), '90' ]);
  //       expect(await this.token.checkpoints(other1, 2)).to.be.deep.equal([ t3.receipt.blockNumber.toString(), '80' ]);
  //       expect(await this.token.checkpoints(other1, 3)).to.be.deep.equal([ t4.receipt.blockNumber.toString(), '100' ]);

  //       await time.advanceBlock();
  //       expect(await this.token.getPastVotes(other1, t1.receipt.blockNumber)).to.be.bignumber.equal('100');
  //       expect(await this.token.getPastVotes(other1, t2.receipt.blockNumber)).to.be.bignumber.equal('90');
  //       expect(await this.token.getPastVotes(other1, t3.receipt.blockNumber)).to.be.bignumber.equal('80');
  //       expect(await this.token.getPastVotes(other1, t4.receipt.blockNumber)).to.be.bignumber.equal('100');
  //     });

  //     it('does not add more than one checkpoint in a block', async function () {
  //       await this.token.transfer(recipient, '100', { from: holder });
  //       expect(await this.token.numCheckpoints(other1)).to.be.bignumber.equal('0');

  //       const [ t1, t2, t3 ] = await batchInBlock([
  //         () => this.token.delegate(other1, { from: recipient, gas: 100000 }),
  //         () => this.token.transfer(other2, 10, { from: recipient, gas: 100000 }),
  //         () => this.token.transfer(other2, 10, { from: recipient, gas: 100000 }),
  //       ]);
  //       expect(await this.token.numCheckpoints(other1)).to.be.bignumber.equal('1');
  //       expect(await this.token.checkpoints(other1, 0)).to.be.deep.equal([ t1.receipt.blockNumber.toString(), '80' ]);
  //       // expectReve(await this.token.checkpoints(other1, 1)).to.be.deep.equal([ '0', '0' ]); // Reverts due to array overflow check
  //       // expect(await this.token.checkpoints(other1, 2)).to.be.deep.equal([ '0', '0' ]); // Reverts due to array overflow check

  //       const t4 = await this.token.transfer(recipient, 20, { from: holder });
  //       expect(await this.token.numCheckpoints(other1)).to.be.bignumber.equal('2');
  //       expect(await this.token.checkpoints(other1, 1)).to.be.deep.equal([ t4.receipt.blockNumber.toString(), '100' ]);
  //     });
  //   });

  //   describe('getPastVotes', function () {
  //     it('reverts if block number >= current block', async function () {
  //       await expectRevert(
  //         this.token.getPastVotes(other1, 5e10),
  //         'ERC20Votes: block not yet mined',
  //       );
  //     });

  //     it('returns 0 if there are no checkpoints', async function () {
  //       expect(await this.token.getPastVotes(other1, 0)).to.be.bignumber.equal('0');
  //     });

  //     it('returns the latest block if >= last checkpoint block', async function () {
  //       const t1 = await this.token.delegate(other1, { from: holder });
  //       await time.advanceBlock();
  //       await time.advanceBlock();

  //       expect(await this.token.getPastVotes(other1, t1.receipt.blockNumber)).to.be.bignumber.equal('10000000000000000000000000');
  //       expect(await this.token.getPastVotes(other1, t1.receipt.blockNumber + 1)).to.be.bignumber.equal('10000000000000000000000000');
  //     });

  //     it('returns zero if < first checkpoint block', async function () {
  //       await time.advanceBlock();
  //       const t1 = await this.token.delegate(other1, { from: holder });
  //       await time.advanceBlock();
  //       await time.advanceBlock();

  //       expect(await this.token.getPastVotes(other1, t1.receipt.blockNumber - 1)).to.be.bignumber.equal('0');
  //       expect(await this.token.getPastVotes(other1, t1.receipt.blockNumber + 1)).to.be.bignumber.equal('10000000000000000000000000');
  //     });

  //     it('generally returns the voting balance at the appropriate checkpoint', async function () {
  //       const t1 = await this.token.delegate(other1, { from: holder });
  //       await time.advanceBlock();
  //       await time.advanceBlock();
  //       const t2 = await this.token.transfer(other2, 10, { from: holder });
  //       await time.advanceBlock();
  //       await time.advanceBlock();
  //       const t3 = await this.token.transfer(other2, 10, { from: holder });
  //       await time.advanceBlock();
  //       await time.advanceBlock();
  //       const t4 = await this.token.transfer(holder, 20, { from: other2 });
  //       await time.advanceBlock();
  //       await time.advanceBlock();

  //       expect(await this.token.getPastVotes(other1, t1.receipt.blockNumber - 1)).to.be.bignumber.equal('0');
  //       expect(await this.token.getPastVotes(other1, t1.receipt.blockNumber)).to.be.bignumber.equal('10000000000000000000000000');
  //       expect(await this.token.getPastVotes(other1, t1.receipt.blockNumber + 1)).to.be.bignumber.equal('10000000000000000000000000');
  //       expect(await this.token.getPastVotes(other1, t2.receipt.blockNumber)).to.be.bignumber.equal('9999999999999999999999990');
  //       expect(await this.token.getPastVotes(other1, t2.receipt.blockNumber + 1)).to.be.bignumber.equal('9999999999999999999999990');
  //       expect(await this.token.getPastVotes(other1, t3.receipt.blockNumber)).to.be.bignumber.equal('9999999999999999999999980');
  //       expect(await this.token.getPastVotes(other1, t3.receipt.blockNumber + 1)).to.be.bignumber.equal('9999999999999999999999980');
  //       expect(await this.token.getPastVotes(other1, t4.receipt.blockNumber)).to.be.bignumber.equal('10000000000000000000000000');
  //       expect(await this.token.getPastVotes(other1, t4.receipt.blockNumber + 1)).to.be.bignumber.equal('10000000000000000000000000');
  //     });
  //   });
  // });

  // describe('getPastTotalSupply', function () {
  //   beforeEach(async function () {
  //     await this.token.delegate(holder, { from: holder });
  //   });

  //   it('reverts if block number >= current block', async function () {
  //     await expectRevert(
  //       this.token.getPastTotalSupply(5e10),
  //       'ERC20Votes: block not yet mined',
  //     );
  //   });

  //   it('returns 0 if there are no checkpoints', async function () {
  //     expect(await this.token.getPastTotalSupply(0)).to.be.bignumber.equal('0');
  //   });

  //   it('returns the latest block if >= last checkpoint block', async function () {
  //     t1 = await this.token.mint(holder, supply);

  //     await time.advanceBlock();
  //     await time.advanceBlock();

  //     expect(await this.token.getPastTotalSupply(t1.receipt.blockNumber)).to.be.bignumber.equal(supply);
  //     expect(await this.token.getPastTotalSupply(t1.receipt.blockNumber + 1)).to.be.bignumber.equal(supply);
  //   });

  //   it('returns zero if < first checkpoint block', async function () {
  //     await time.advanceBlock();
  //     const t1 = await this.token.mint(holder, supply);
  //     await time.advanceBlock();
  //     await time.advanceBlock();

  //     expect(await this.token.getPastTotalSupply(t1.receipt.blockNumber - 1)).to.be.bignumber.equal('0');
  //     expect(await this.token.getPastTotalSupply(t1.receipt.blockNumber + 1)).to.be.bignumber.equal('10000000000000000000000000');
  //   });

  //   it('generally returns the voting balance at the appropriate checkpoint', async function () {
  //     const t1 = await this.token.mint(holder, supply);
  //     await time.advanceBlock();
  //     await time.advanceBlock();
  //     const t2 = await this.token.burn(holder, 10);
  //     await time.advanceBlock();
  //     await time.advanceBlock();
  //     const t3 = await this.token.burn(holder, 10);
  //     await time.advanceBlock();
  //     await time.advanceBlock();
  //     const t4 = await this.token.mint(holder, 20);
  //     await time.advanceBlock();
  //     await time.advanceBlock();

  //     expect(await this.token.getPastTotalSupply(t1.receipt.blockNumber - 1)).to.be.bignumber.equal('0');
  //     expect(await this.token.getPastTotalSupply(t1.receipt.blockNumber)).to.be.bignumber.equal('10000000000000000000000000');
  //     expect(await this.token.getPastTotalSupply(t1.receipt.blockNumber + 1)).to.be.bignumber.equal('10000000000000000000000000');
  //     expect(await this.token.getPastTotalSupply(t2.receipt.blockNumber)).to.be.bignumber.equal('9999999999999999999999990');
  //     expect(await this.token.getPastTotalSupply(t2.receipt.blockNumber + 1)).to.be.bignumber.equal('9999999999999999999999990');
  //     expect(await this.token.getPastTotalSupply(t3.receipt.blockNumber)).to.be.bignumber.equal('9999999999999999999999980');
  //     expect(await this.token.getPastTotalSupply(t3.receipt.blockNumber + 1)).to.be.bignumber.equal('9999999999999999999999980');
  //     expect(await this.token.getPastTotalSupply(t4.receipt.blockNumber)).to.be.bignumber.equal('10000000000000000000000000');
  //     expect(await this.token.getPastTotalSupply(t4.receipt.blockNumber + 1)).to.be.bignumber.equal('10000000000000000000000000');
  //   });
  // });
});
