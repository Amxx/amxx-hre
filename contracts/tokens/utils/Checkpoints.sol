// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/utils/math/SafeCast.sol";

library Checkpoints {
    struct Checkpoint {
        uint32 index;
        uint224 value;
    }

    struct History {
        Checkpoint[] _checkpoints;
    }

    function length(History storage self) internal view returns (uint256) {
        return self._checkpoints.length;
    }

    function at(History storage self, uint256 pos) internal view returns (Checkpoint memory) {
        return self._checkpoints[pos];
    }

    function latest(History storage self) internal view returns (uint256) {
        uint256 pos = length(self);
        return pos == 0 ? 0 : at(self, pos - 1).value;
    }

    function past(History storage self, uint256 index) internal view returns (uint256) {
        require(index < block.number, "block not yet mined");

        uint256 high = length(self);
        uint256 low = 0;
        while (low < high) {
            uint256 mid = Math.average(low, high);
            if (at(self, mid).index > index) {
                high = mid;
            } else {
                low = mid + 1;
            }
        }
        return high == 0 ? 0 : at(self, high - 1).value;
    }

    function push(
        History storage self,
        uint256 value
    ) internal returns (uint256, uint256) {
        uint256 pos = length(self);
        uint256 old = latest(self);
        if (pos > 0 && self._checkpoints[pos - 1].index == block.number) {
            self._checkpoints[pos - 1].value = SafeCast.toUint224(value);
        } else {
            self._checkpoints.push(Checkpoint({ index: SafeCast.toUint32(block.number), value: SafeCast.toUint224(value) }));
        }
        return (old, value);
    }

    function push(
        History storage self,
        function(uint256, uint256) view returns (uint256) op,
        uint256 delta
    ) internal returns (uint256, uint256) {
        return push(self, op(latest(self), delta));
    }
}