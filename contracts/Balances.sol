// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "./Distributions.sol";

library Balances {
    using Distributions for Distributions.Uint256;
    using EnumerableSet for EnumerableSet.UintSet;

    struct Fungible {
        Distributions.Uint256 _balances;
    }

    function balanceOf(Fungible storage self, address account) internal view returns (uint256) {
        return self._balances.valueOf(account);
    }

    function totalSupply(Fungible storage self) internal view returns (uint256) {
        return self._balances.total();
    }

    function mint(Fungible storage self, address account, uint256 amount) internal {
        require(account != address(0), "mint to the zero address");
        self._balances.incr(account, amount);
    }

    function burn(Fungible storage self, address account, uint256 amount) internal {
        require(account != address(0), "burn from the zero address");
        self._balances.decr(account, amount);
    }

    function transfer(Fungible storage self, address from, address to, uint256 amount) internal {
        require(from != address(0), "transfer from the zero address");
        require(to != address(0), "transfer to the zero address");
        self._balances.mv(from, to, amount);
    }

    struct NonFungible {
        mapping(uint256 => address) _owner;
    }

    function ownerOf(NonFungible storage self, uint256 tokenid) internal view returns (address) {
        return self._owner[tokenid];
    }

    function mint(NonFungible storage self, address account, uint256 tokenid) internal {
        require(ownerOf(self, tokenid) == address(0), "token already exists");
        self._owner[tokenid] = account;
    }

    function burn(NonFungible storage self, uint256 tokenid) internal {
        require(ownerOf(self, tokenid) != address(0), "token doesn't exist");
        self._owner[tokenid] = address(0);
    }

    function transfer(NonFungible storage self, uint256 tokenid, address to) internal {
        require(ownerOf(self, tokenid) != address(0), "token doesn't exist");
        self._owner[tokenid] = to;
    }

    struct NonFungibleEnumerable {
        NonFungible                               _base;
        EnumerableSet.UintSet                     _allTokens;
        mapping(address => EnumerableSet.UintSet) _userTokens;
    }

    function totalSupply(NonFungibleEnumerable storage self) internal view returns (uint256) {
        return self._allTokens.length();
    }

    function at(NonFungibleEnumerable storage self, uint256 idx) internal view returns (uint256) {
        return self._allTokens.at(idx);
    }

    function balanceOf(NonFungibleEnumerable storage self, address account) internal view returns (uint256) {
        return self._userTokens[account].length();
    }

    function at(NonFungibleEnumerable storage self, address account, uint256 idx) internal view returns (uint256) {
        return self._userTokens[account].at(idx);
    }

    function ownerOf(NonFungibleEnumerable storage self, uint256 tokenid) internal view returns (address) {
        return ownerOf(self._base, tokenid);
    }

    function mint(NonFungibleEnumerable storage self, address account, uint256 tokenid) internal {
        mint(self._base, account, tokenid);
        self._allTokens.add(tokenid);
        self._userTokens[account].add(tokenid);
    }

    function burn(NonFungibleEnumerable storage self, uint256 tokenid) internal {
        address account = Balances.ownerOf(self._base, tokenid);
        burn(self._base, tokenid);
        self._allTokens.add(tokenid);
        self._userTokens[account].add(tokenid);
    }

    function transfer(NonFungibleEnumerable storage self, uint256 tokenid, address to) internal {
        address from = ownerOf(self, tokenid);
        transfer(self._base, tokenid, to);
        self._userTokens[from].remove(tokenid);
        self._userTokens[to].add(tokenid);
    }
}
