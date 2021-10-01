// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "../utils/WithNonce.sol";
import "../Voting.sol";

bytes32 constant _DELEGATION_TYPEHASH = keccak256("Delegation(address delegatee,uint256 nonce,uint256 expiry)");

abstract contract ERC721Votes is ERC721, WithNonce {
    using Voting for Voting.Votes;

    Voting.Votes private _votes;

    event DelegateChanged(address indexed delegator, address indexed fromDelegate, address indexed toDelegate);
    event DelegateVotesChanged(address indexed delegate, uint256 previousBalance, uint256 newBalance);

    function delegates(address account) public view virtual returns (address) {
        return _votes.delegates(account);
    }

    function getVotes(address account) public view returns (uint256) {
        return _votes.getVotes(account);
    }

    function getPastVotes(address account, uint256 blockNumber) public view returns (uint256) {
        return _votes.getVotesAt(account, blockNumber);
    }

    function getPastTotalSupply(uint256 blockNumber) public view returns (uint256) {
        return _votes.getTotalVotesAt(blockNumber);
    }

    function delegate(address delegatee) public virtual {
        _delegate(_msgSender(), delegatee);
    }

    function delegateBySig(
        address delegatee,
        uint256 nonce,
        uint256 expiry,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public virtual {
        require(block.timestamp <= expiry, "signature expired");
        address signer = ECDSA.recover(
            _hashTypedDataV4(keccak256(abi.encode(_DELEGATION_TYPEHASH, delegatee, nonce, expiry))),
            v,
            r,
            s
        );
        require(nonce == _useNonce(signer), "invalid nonce");
        return _delegate(signer, delegatee);
    }

    function _delegate(address delegator, address delegatee) public virtual {
        emit DelegateChanged(delegator, delegates(delegator), delegatee);
        _votes.delegate(delegator, delegatee, balanceOf(delegator), _hookDelegateVotesChanged);
    }

    function _mint(address to, uint256 tokenId) internal virtual override {
        super._mint(to, tokenId);
        _votes.mint(to, 1, _hookDelegateVotesChanged);
    }

    function _burn(uint256 tokenId) internal virtual override {
        address from = ownerOf(tokenId);
        super._burn(tokenId);
        _votes.burn(from, 1, _hookDelegateVotesChanged);
    }

    function _transfer(address from, address to, uint256 tokenId) internal virtual override {
        super._transfer(from, to, tokenId);
        _votes.transfer(from, to, 1, _hookDelegateVotesChanged);
    }

    function _hookDelegateVotesChanged(address account, uint256 previousBalance, uint256 newBalance) private {
        emit DelegateVotesChanged(account, previousBalance, newBalance);
    }
}