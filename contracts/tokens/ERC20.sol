// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "@openzeppelin/contracts/interfaces/IERC20Metadata.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import "./utils/Allowances.sol";
import "./utils/Balances.sol";

contract ERC20 is ERC165, IERC20, IERC20Metadata {
    using Balances   for Balances.Fungible;
    using Allowances for Allowances.Fungible;

    string              private _name;
    string              private _symbol;
    Balances.Fungible   private _balances;
    Allowances.Fungible private _allowances;

    constructor(string memory name_, string memory symbol_) {
        _name   = name_;
        _symbol = symbol_;
    }

    function name() public view virtual override returns (string memory) {
        return _name;
    }

    function symbol() public view virtual override returns (string memory) {
        return _symbol;
    }

    function decimals() public pure virtual override returns (uint8) {
        return 18;
    }

    function balanceOf(address account) public view virtual override returns (uint256) {
        return _balances.balanceOf(account);
    }

    function totalSupply() public view virtual override returns (uint256) {
        return _balances.totalSupply();
    }

    function allowance(address owner, address spender) public view virtual override returns (uint256) {
        return _allowances.allowance(owner, spender);
    }

    function transfer(address to, uint256 amount) public virtual override returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) public virtual override returns (bool) {
        _spendAllowance(from, msg.sender, amount);
        _transfer(from, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) public virtual override returns (bool) {
        _approve(msg.sender, spender, amount);
        return true;
    }

    function _mint(address to, uint256 amount) internal virtual {
        require(to != address(0), "mint to the zero address");

        _beforeTokenTransfer(address(0), to, amount);

        _balances.mint(to, amount);
        emit Transfer(address(0), to, amount);

        _afterTokenTransfer(address(0), to, amount);
    }

    function _burn(address from, uint256 amount) internal virtual {
        require(from != address(0), "burn from the zero address");

        _beforeTokenTransfer(from, address(0), amount);

        _balances.burn(from, amount);
        emit Transfer(from, address(0), amount);

        _afterTokenTransfer(from, address(0), amount);
    }

    function _transfer(address from, address to, uint256 amount) internal virtual {
        require(from != address(0), "transfer from the zero address");
        require(to   != address(0), "transfer to the zero address");

        _beforeTokenTransfer(from, to, amount);

        _balances.transfer(from, to, amount);
        emit Transfer(from, to, amount);

        _afterTokenTransfer(from, to, amount);
    }

    function _approve(address owner, address spender, uint256 amount) internal virtual {
        require(owner   != address(0), "approve from the zero address");
        require(spender != address(0), "approve to the zero address");

        _allowances.approve(owner, spender, amount);
        emit Approval(owner, spender, amount);
    }

    function _spendAllowance(address owner, address spender, uint256 amount) internal virtual {
        uint256 currentAllowance = allowance(owner, spender);

        if (currentAllowance != type(uint256).max) {
            require(currentAllowance >= amount, "insufficient allowance");
            _approve(owner, spender, currentAllowance - amount);
        }
    }

    function _beforeTokenTransfer(address from, address to, uint256 amount) internal virtual {}

    function _afterTokenTransfer(address from, address to, uint256 amount) internal virtual {}
}