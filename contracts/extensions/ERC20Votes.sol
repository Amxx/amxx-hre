// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "../utils/WithDelegate.sol";
import "../Voting.sol";

abstract contract ERC20Votes is ERC20Permit, WithDelegate {
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

    function _mint(address to, uint256 amount) internal virtual override {
        super._mint(to, amount);
        _votes.mint(to, amount, _hookDelegateVotesChanged);
    }

    function _burn(address from, uint256 amount) internal virtual override {
        super._burn(from, amount);
        _votes.burn(from, amount, _hookDelegateVotesChanged);
    }

    function _transfer(address from, address to, uint256 amount) internal virtual override {
        super._transfer(from, to, amount);
        _votes.transfer(from, to, amount, _hookDelegateVotesChanged);
    }

    function _afterDelegateChange(address delegator, address oldDelegatee, address newDelegatee) internal virtual override {
        super._afterDelegateChange(delegator, oldDelegatee, newDelegatee);
        _votes.delegate(delegator, newDelegatee, balanceOf(delegator), _hookDelegateVotesChanged);
    }

    function _useNonce(address owner) internal virtual override(ERC20Permit, WithDelegate) returns (uint256 current) {
        return super._useNonce(owner);
    }

    function _hookDelegateVotesChanged(address account, uint256 previousBalance, uint256 newBalance) private {
        emit DelegateVotesChanged(account, previousBalance, newBalance);
    }
}