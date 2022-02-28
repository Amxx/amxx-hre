// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/cryptography/draft-EIP712.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

abstract contract WithTokenNonce is EIP712 {
    using Counters for Counters.Counter;

    mapping(uint256 => Counters.Counter) private _tokenNonces;

    function nonces(uint256 tokenId) public view virtual returns (uint256) {
        return _tokenNonces[tokenId].current();
    }

    function _useNonce(uint256 tokenId) internal virtual returns (uint256 current) {
        Counters.Counter storage nonce = _tokenNonces[tokenId];
        current = nonce.current();
        nonce.increment();
    }
}