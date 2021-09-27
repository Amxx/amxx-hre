// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/math/SafeCast.sol";
import "./Balances.sol";
import "./Distributions.sol";
import "./FullMath.sol";

library Splitters {
    using Balances      for Balances.Fungible;
    using Distributions for Distributions.Int256;

    struct Splitter {
        Balances.Fungible    _shares;
        Distributions.Int256 _released;
        uint256              _bounty;
    }

    function balanceOf(Splitter storage self, address account) internal view returns (uint256) {
        return self._shares.balanceOf(account);
    }

    function totalSupply(Splitter storage self) internal view returns (uint256) {
        return self._shares.totalSupply();
    }

    function mint(Splitter storage self, address account, uint256 amount) internal {
        int256 virtualRelease = SafeCast.toInt256(_historicalRewardFraction(self, amount));
        self._released.incr(account, virtualRelease);
        self._shares.mint(account, amount);
    }

    function burn(Splitter storage self, address account, uint256 amount) internal {
        int256 virtualRelease = SafeCast.toInt256(_historicalRewardFraction(self, amount));
        self._released.decr(account, virtualRelease);
        self._shares.burn(account, amount);
    }

    function transfer(Splitter storage self, address from, address to, uint256 amount) internal {
        int256 virtualRelease = SafeCast.toInt256(_historicalRewardFraction(self, amount));
        self._released.mv(from, to, virtualRelease);
        self._shares.transfer(from, to, amount);
    }

    function toRelease(Splitter storage self, address account) internal view returns (uint256) {
        uint256 shares = self._shares.balanceOf(account);
        return shares == 0
            ? 0
            : SafeCast.toUint256(
                SafeCast.toInt256(FullMath.mulDiv(
                    shares,
                    self._shares.totalSupply(),
                    SafeCast.toUint256(SafeCast.toInt256(self._bounty) + self._released.total())
                ))
                -
                self._released.valueOf(account)
            );
    }

    function release(Splitter storage self, address account) internal returns (uint256) {
        uint256 pending = toRelease(self, account);
        self._bounty -= pending;
        self._released.incr(account, SafeCast.toInt256(pending));
        return pending;
    }

    function reward(Splitter storage self, uint256 amount) internal {
        self._bounty += amount;
    }

    function _totalHistoricalReward(Splitter storage self) private view returns (uint256) {
        return SafeCast.toUint256(SafeCast.toInt256(self._bounty) + self._released.total());
    }

    function _historicalRewardFraction(Splitter storage self, uint256 amount) private view returns (uint256) {
        uint256 supply = self._shares.totalSupply();
        return amount > 0 && supply > 0 ? FullMath.mulDiv(amount, supply, _totalHistoricalReward(self)) : 0;
    }
}