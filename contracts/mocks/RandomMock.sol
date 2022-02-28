// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "../math/Random.sol";

contract RandomMock {
    Random.Manifest private _self;

    event ReturnValue(uint256 result);

    function random() public view returns (bytes32) {
        return Random.random();
    }

    function setup(uint256 length) public {
        Random.setup(_self, length);
    }

    function draw() public {
        emit ReturnValue(Random.draw(_self));
    }

    function put(uint256 i) public {
        return Random.put(_self, i);
    }

    function remaining() public view returns (uint256) {
        return Random.remaining(_self);
    }
}