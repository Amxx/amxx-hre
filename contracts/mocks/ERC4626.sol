// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "../tokens/ERC4626.sol";

contract ERC4626Mock is
    ERC4626
{
    constructor(string memory name, string memory symbol, IERC20Metadata asset)
        ERC20(name, symbol)
        ERC4626(asset)
    {}
}
