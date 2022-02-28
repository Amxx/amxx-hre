const { ethers   } = require('hardhat');
const chai         = require('chai');
const { solidity } = require('ethereum-waffle');
const { deploy   } = require('../../scripts');
const { expect   } = chai;
chai.use(solidity);


function shouldBehaveLikeERC20 (initialSupply, accounts) {
  describe('total supply', function () {
    it('returns the total amount of tokens', async function () {
      expect(await this.token.totalSupply()).to.be.equal(initialSupply);
    });
  });

  describe('balanceOf', function () {
    describe('when the requested account has no tokens', function () {
      it('returns zero', async function () {
        expect(await this.token.balanceOf(accounts.other.address)).to.be.equal(0);
      });
    });

    describe('when the requested account has some tokens', function () {
      it('returns the total amount of tokens', async function () {
        expect(await this.token.balanceOf(accounts.holder.address)).to.be.equal(initialSupply);
      });
    });
  });

  describe('transfer', function () {
    shouldBehaveLikeERC20Transfer(
      initialSupply,
      accounts,
      function (from, to, amount) {
        return this.token.connect(from).transfer(to.address, amount);
      },
    );
  });

  describe('approve', function () {
    shouldBehaveLikeERC20Approve(
      initialSupply,
      accounts,
      function (owner, spender, amount) {
        return this.token.connect(owner).approve(spender.address, amount);
      },
    );
  });

  describe('transfer from', function () {
    describe('when the token owner is not the zero address', function () {
      describe('when the recipient is not the zero address', function () {
        describe('when the spender has enough allowance', function () {
          const allowance = initialSupply;
          const amount    = initialSupply;

          beforeEach(async function () {
            await this.token.connect(accounts.holder).approve(accounts.other.address, allowance);
          });

          describe('when the token owner has enough balance', function () {
            it('transfers the requested amount', async function () {
              await this.token.connect(accounts.other).transferFrom(accounts.holder.address, accounts.recipient.address, amount);

              expect(await this.token.balanceOf(accounts.holder.address)).to.be.equal(0);
              expect(await this.token.balanceOf(accounts.recipient.address)).to.be.equal(amount);
            });

            it('decreases the spender allowance', async function () {
              await this.token.connect(accounts.other).transferFrom(accounts.holder.address, accounts.recipient.address, amount);

              expect(await this.token.allowance(accounts.holder.address, accounts.other.address)).to.be.equal(0);
            });

            it('emits a transfer event', async function () {
              expect(await this.token.connect(accounts.other).transferFrom(accounts.holder.address, accounts.recipient.address, amount))
              .to.emit(this.token, 'Transfer').withArgs(accounts.holder.address, accounts.recipient.address, amount);
            });

            it('emits an approval event', async function () {
              expect(await this.token.connect(accounts.other).transferFrom(accounts.holder.address, accounts.recipient.address, amount))
              .to.emit(this.token, 'Approval').withArgs(accounts.holder.address, accounts.other.address, 0);
            });
          });

          describe('when the token owner does not have enough balance', function () {
            beforeEach('reducing balance', async function () {
              await this.token.connect(accounts.holder).transfer(accounts.recipient.address, 1);
            });

            it('reverts', async function () {
              await expect(this.token.connect(accounts.other).transferFrom(accounts.holder.address, accounts.recipient.address, amount))
              .to.be.revertedWith('transfer amount exceeds balance');
            });
          });
        });

        describe('when the spender does not have enough allowance', function () {
          const allowance = initialSupply.sub(1);
          const amount    = initialSupply;

          beforeEach(async function () {
            await this.token.connect(accounts.holder).approve(accounts.other.address, allowance);
          });

          describe('when the token owner has enough balance', function () {
            it('reverts', async function () {
              await expect(this.token.connect(accounts.other).transferFrom(accounts.holder.address, accounts.recipient.address, amount))
              .to.be.revertedWith('insufficient allowance');
            });
          });

          describe('when the token owner does not have enough balance', function () {
            beforeEach('reducing balance', async function () {
              await this.token.connect(accounts.holder).transfer(accounts.recipient.address, 2);
            });

            it('reverts', async function () {
              await expect(this.token.connect(accounts.other).transferFrom(accounts.holder.address, accounts.recipient.address, allowance))
              .to.be.revertedWith('transfer amount exceeds balance');
            });
          });
        });

        describe('when the spender has unlimited allowance', function () {
          beforeEach(async function () {
            await this.token.connect(accounts.holder).approve(accounts.other.address, ethers.constants.MaxUint256);
          });

          it('does not decrease the spender allowance', async function () {
            await this.token.connect(accounts.other).transferFrom(accounts.holder.address, accounts.recipient.address, 1);

            expect(await this.token.allowance(accounts.holder.address, accounts.other.address)).to.be.equal(ethers.constants.MaxUint256);
          });

          it('does not emit an approval event', async function () {
            expect(await this.token.connect(accounts.other).transferFrom(accounts.holder.address, accounts.recipient.address, 1))
            .to.not.emit(this.token, 'Approval');
          });
        });
      });

      describe('when the recipient is the zero address', function () {
        beforeEach(async function () {
          await this.token.connect(accounts.holder).approve(accounts.other.address, initialSupply);
        });

        it('reverts', async function () {
          await expect(this.token.connect(accounts.other).transferFrom(accounts.holder.address, ethers.constants.AddressZero, initialSupply))
          .to.be.revertedWith('transfer to the zero address');
        });
      });
    });

    describe('when the token owner is the zero address', function () {
      it('reverts', async function () {
        await expect(this.token.connect(accounts.other).transferFrom(ethers.constants.AddressZero, accounts.recipient.address, 0))
        .to.be.revertedWith('from the zero address');
      });
    });
  });
}

function shouldBehaveLikeERC20Transfer (supply, accounts, transfer) {
  describe('when the recipient is not the zero address', function () {
    describe('when the sender does not have enough balance', function () {
      const amount = supply.add(1);

      it('reverts', async function () {
        await expect(transfer.call(this, accounts.holder, accounts.recipient, amount))
        .to.be.revertedWith('transfer amount exceeds balance');
      });
    });

    describe('when the sender transfers all balance', function () {
      const amount = supply;

      it('transfers the requested amount', async function () {
        await transfer.call(this, accounts.holder, accounts.recipient, amount);

        expect(await this.token.balanceOf(accounts.holder.address)).to.be.equal(0);
        expect(await this.token.balanceOf(accounts.recipient.address)).to.be.equal(amount);
      });

      it('emits a transfer event', async function () {
        expect(await transfer.call(this, accounts.holder, accounts.recipient, amount))
        .to.emit(this.token, 'Transfer').withArgs(accounts.holder.address, accounts.recipient.address, amount);
      });
    });

    describe('when the sender transfers zero tokens', function () {
      const amount = ethers.constants.Zero;

      it('transfers the requested amount', async function () {
        await transfer.call(this, accounts.holder, accounts.recipient, amount);

        expect(await this.token.balanceOf(accounts.holder.address)).to.be.equal(supply);
        expect(await this.token.balanceOf(accounts.recipient.address)).to.be.equal(0);
      });

      it('emits a transfer event', async function () {
        expect(await transfer.call(this, accounts.holder, accounts.recipient, amount))
        .to.emit(this.token, 'Transfer').withArgs(accounts.holder.address, accounts.recipient.address, amount);
      });
    });
  });

  describe('when the recipient is the zero address', function () {
    it('reverts', async function () {
      await expect(transfer.call(this, accounts.holder, { address: ethers.constants.AddressZero }, supply))
      .to.be.revertedWith('transfer to the zero address');
    });
  });
}

function shouldBehaveLikeERC20Approve (supply, accounts, approve) {
  describe('when the spender is not the zero address', function () {
    describe('when the sender has enough balance', function () {
      const amount = supply;

      it('emits an approval event', async function () {
        expect(await approve.call(this, accounts.holder, accounts.recipient, amount))
        .to.emit(this.token, 'Approval').withArgs(accounts.holder.address, accounts.recipient.address, amount);
      });

      describe('when there was no approved amount before', function () {
        it('approves the requested amount', async function () {
          await approve.call(this, accounts.holder, accounts.recipient, amount);

          expect(await this.token.allowance(accounts.holder.address, accounts.recipient.address)).to.be.equal(amount);
        });
      });

      describe('when the spender had an approved amount', function () {
        beforeEach(async function () {
          await approve.call(this, accounts.holder, accounts.recipient, 1);
        });

        it('approves the requested amount and replaces the previous one', async function () {
          await approve.call(this, accounts.holder, accounts.recipient, amount);

          expect(await this.token.allowance(accounts.holder.address, accounts.recipient.address)).to.be.equal(amount);
        });
      });
    });

    describe('when the sender does not have enough balance', function () {
      const amount = supply.add(1);

      it('emits an approval event', async function () {
        expect(await approve.call(this, accounts.holder, accounts.recipient, amount))
        .to.emit(this.token, 'Approval').withArgs(accounts.holder.address, accounts.recipient.address, amount);
      });

      describe('when there was no approved amount before', function () {
        it('approves the requested amount', async function () {
          await approve.call(this, accounts.holder, accounts.recipient, amount);

          expect(await this.token.allowance(accounts.holder.address, accounts.recipient.address)).to.be.equal(amount);
        });
      });

      describe('when the spender had an approved amount', function () {
        beforeEach(async function () {
          await approve.call(this, accounts.holder, accounts.recipient, 1);
        });

        it('approves the requested amount and replaces the previous one', async function () {
          await approve.call(this, accounts.holder, accounts.recipient, amount);

          expect(await this.token.allowance(accounts.holder.address, accounts.recipient.address)).to.be.equal(amount);
        });
      });
    });
  });

  describe('when the spender is the zero address', function () {
    it('reverts', async function () {
      await expect(approve.call(this, accounts.holder, { address: ethers.constants.AddressZero }, supply))
      .to.be.revertedWith('approve to the zero address');
    });
  });
}

module.exports = {
  shouldBehaveLikeERC20,
  shouldBehaveLikeERC20Transfer,
  shouldBehaveLikeERC20Approve,
};
