// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "../utils/WithNonce.sol";
import "../utils/WithDelegate.sol";
import "../Voting.sol";

abstract contract ERC721Votes is ERC721, WithNonce, WithDelegate {
    using Voting for Voting.Votes;

    Voting.Votes private _votes;

    event DelegateVotesChanged(address indexed delegate, uint256 previousBalance, uint256 newBalance);

    function getVotes(address account) public view returns (uint256) {
        return _votes.getVotes(account);
    }

    function getPastVotes(address account, uint256 blockNumber) public view returns (uint256) {
        return _votes.getVotesAt(account, blockNumber);
    }

    function getPastTotalSupply(uint256 blockNumber) public view returns (uint256) {
        return _votes.getTotalVotesAt(blockNumber);
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

    function _afterDelegateChange(address delegator, address oldDelegatee, address newDelegatee) internal virtual override {
        super._afterDelegateChange(delegator, oldDelegatee, newDelegatee);
        _votes.delegate(delegator, newDelegatee, balanceOf(delegator), _hookDelegateVotesChanged);
    }

    function _useNonce(address owner) internal virtual override(WithNonce, WithDelegate) returns (uint256 current) {
        return super._useNonce(owner);
    }

    function _hookDelegateVotesChanged(address account, uint256 previousBalance, uint256 newBalance) private {
        emit DelegateVotesChanged(account, previousBalance, newBalance);
    }
}