// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

library CardDeck {
    struct Manifest {
        uint256[] _data;
    }

    function setup(Manifest storage manifest, uint256 length) internal {
        uint256[] storage data = manifest._data;

        require(data.length == 0, 'cannot-setup-during-active-draw');
        assembly { sstore(data.slot, length) }
    }

    function draw(Manifest storage manifest) internal returns (uint256) {
        uint256[] storage data = manifest._data;

        uint256 l = data.length;
        uint256 i = seed() % l;
        uint256 x = data[i];
        uint256 y = data[--l];
        if (x == 0) { x = i + 1;   }
        if (y == 0) { y = l + 1;   }
        if (i != l) { data[i] = y; }
        data.pop();
        return x - 1;
    }

    function put(Manifest storage manifest, uint256 i) internal {
        manifest._data.push(i);
    }

    function remaining(Manifest storage manifest) internal view returns (uint256) {
        return manifest._data.length;
    }

    function seed() internal view returns (uint256) {
        return uint256(keccak256(abi.encodePacked(block.difficulty, block.timestamp, msg.sender))) ;
    }
}