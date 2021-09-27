// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./Balances.sol";
import "./Checkpoints.sol";

library Voting {
    using Balances    for Balances.Fungible;
    using Balances    for Balances.NonFungibleEnumerable;
    using Checkpoints for Checkpoints.History;

    struct Votes {
        mapping(address => address)             _delegation;
        Checkpoints.History                     _totalCheckpoints;
        mapping(address => Checkpoints.History) _userCheckpoints;
    }

    function getVotes(Votes storage self, address account) internal view returns (uint256) {
        return self._userCheckpoints[account].latest();
    }

    function getVotesAt(Votes storage self, address account, uint256 timestamp) internal view returns (uint256) {
        return self._userCheckpoints[account].past(timestamp);
    }

    function getTotalVotes(Votes storage self) internal view returns (uint256) {
        return self._totalCheckpoints.latest();
    }

    function getTotalVotesAt(Votes storage self, uint256 timestamp) internal view returns (uint256) {
        return self._totalCheckpoints.past(timestamp);
    }

    function delegation(Votes storage self, address account) internal view returns (address) {
        return self._delegation[account];
    }

    function delegate(Votes storage self, address account, address newDelegation, uint256 balance) internal {
        address oldDelegation = delegation(self, account);
        self._delegation[account] = newDelegation;
        moveVotingPower(self, oldDelegation, newDelegation, balance);
    }

    function transfer(Votes storage self, address src, address dst, uint256 amount) internal {
        moveVotingPower(self, delegation(self, src), delegation(self, dst), amount);
    }

   function moveVotingPower(Votes storage self, address src, address dst, uint256 amount) private {
        if (src != dst && amount > 0) {
            if (src == address(0)) {
                self._totalCheckpoints.push(_add, amount);
            } else {
                self._userCheckpoints[src].push(_subtract, amount);
            }
            if (dst == address(0)) {
                self._totalCheckpoints.push(_subtract, amount);
            } else {
                self._userCheckpoints[dst].push(_add, amount);
            }
        }
    }

    function _add(uint256 a, uint256 b) private pure returns (uint256) {
        return a + b;
    }

    function _subtract(uint256 a, uint256 b) private pure returns (uint256) {
        return a - b;
    }

    struct FungibleVoting {
        Balances.Fungible _balances;
        Votes             _votes;
    }

    function balanceOf(FungibleVoting storage self, address account) internal view returns (uint256) {
        return self._balances.balanceOf(account);
    }

    function totalSupply(FungibleVoting storage self) internal view returns (uint256) {
        return self._balances.totalSupply();
    }

    function getVotes(FungibleVoting storage self, address account) internal view returns (uint256) {
        return getVotes(self._votes, account);
    }

    function getVotesAt(FungibleVoting storage self, address account, uint256 timestamp) internal view returns (uint256) {
        return getVotesAt(self._votes, account, timestamp);
    }

    function getTotalVotes(FungibleVoting storage self) internal view returns (uint256) {
        return getTotalVotes(self._votes);
    }

    function getTotalVotesAt(FungibleVoting storage self, uint256 timestamp) internal view returns (uint256) {
        return getTotalVotesAt(self._votes, timestamp);
    }

    function delegation(FungibleVoting storage self, address account) internal view returns (address) {
        return delegation(self._votes, account);
    }

    function delegate(FungibleVoting storage self, address account, address newDelegation) internal {
        delegate(self._votes, account, newDelegation, balanceOf(self, account));
    }

    function mint(FungibleVoting storage self, address account, uint256 amount) internal {
        self._balances.mint(account, amount);
        transfer(self._votes, address(0), account, amount);
    }

    function burn(FungibleVoting storage self, address account, uint256 amount) internal {
        self._balances.burn(account, amount);
        transfer(self._votes, account, address(0), amount);
    }

    function transfer(FungibleVoting storage self, address from, address to, uint256 amount) internal {
        self._balances.transfer(from, to, amount);
        transfer(self._votes, from, to, amount);
    }

    struct NonFungibleVoting {
        Balances.NonFungibleEnumerable _balances;
        Votes                          _votes;
    }

    function balanceOf(NonFungibleVoting storage self, address account) internal view returns (uint256) {
        return self._balances.balanceOf(account);
    }

    function totalSupply(NonFungibleVoting storage self) internal view returns (uint256) {
        return self._balances.totalSupply();
    }

    function getVotes(NonFungibleVoting storage self, address account) internal view returns (uint256) {
        return getVotes(self._votes, account);
    }

    function getVotesAt(NonFungibleVoting storage self, address account, uint256 timestamp) internal view returns (uint256) {
        return getVotesAt(self._votes, account, timestamp);
    }

    function getTotalVotes(NonFungibleVoting storage self) internal view returns (uint256) {
        return getTotalVotes(self._votes);
    }

    function getTotalVotesAt(NonFungibleVoting storage self, uint256 timestamp) internal view returns (uint256) {
        return getTotalVotesAt(self._votes, timestamp);
    }

    function delegation(NonFungibleVoting storage self, address account) internal view returns (address) {
        return delegation(self._votes, account);
    }

    function delegate(NonFungibleVoting storage self, address account, address newDelegation) internal {
        delegate(self._votes, account, newDelegation, balanceOf(self, account));
    }

    function mint(NonFungibleVoting storage self, address account, uint256 tokenid) internal {
        self._balances.mint(account, tokenid);
        transfer(self._votes, address(0), account, 1);
    }

    function burn(NonFungibleVoting storage self, address from, uint256 tokenid) internal {
        self._balances.burn(from, tokenid);
        transfer(self._votes, from, address(0), 1);
    }

    function transfer(NonFungibleVoting storage self, address from, address to, uint256 tokenid) internal {
        self._balances.transfer(from, to, tokenid);
        transfer(self._votes, from, to, 1);
    }
}