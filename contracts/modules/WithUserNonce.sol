// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/cryptography/draft-EIP712.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

abstract contract WithUserNonce is EIP712 {
    using Counters for Counters.Counter;

    mapping(address => Counters.Counter) private _userNonces;

    function nonces(address owner) public view virtual returns (uint256) {
        return _userNonces[owner].current();
    }

    function _useNonce(address owner) internal virtual returns (uint256 current) {
        Counters.Counter storage nonce = _userNonces[owner];
        current = nonce.current();
        nonce.increment();
    }
}