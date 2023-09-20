// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import { ERC20, ERC1363 } from "../tokens/ERC1363.sol";

contract ERC1363Mock is ERC1363 {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {}

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
}
