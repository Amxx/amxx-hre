// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "../tokens/ERC20.sol";
import "../tokens/ERC20Votes.sol";
import "../tokens/ERC2612.sol";
import "../tokens/ERC3156.sol";

contract ERC20Mock is
    ERC20,
    ERC20Votes,
    ERC2612,
    ERC3156
{
    constructor(string memory name, string memory symbol)
        ERC20(name, symbol)
        EIP712(name, "1")
    {}

    function mint(address account, uint256 amount) public {
        _mint(account, amount);
    }

    function burn(address account, uint256 amount) public {
        _burn(account, amount);
    }

    function transferInternal(
        address from,
        address to,
        uint256 amount
    ) public {
        _transfer(from, to, amount);
    }

    function approveInternal(
        address owner,
        address spender,
        uint256 amount
    ) public {
        _approve(owner, spender, amount);
    }

    function nonces(address accounts) public view override(ERC2612, WithUserNonce) returns (uint256) {
        return super.nonces(accounts);
    }

    function _afterTokenTransfer(address from, address to, uint256 amount) internal override(ERC20, ERC20Votes) {
        super._afterTokenTransfer(from, to, amount);
    }
}
