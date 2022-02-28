// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;


library Allowances {
    struct Fungible {
        mapping(address => mapping(address => uint256)) _allowances;
    }

    function allowance(Fungible storage self, address owner, address spender) internal view returns (uint256) {
        return self._allowances[owner][spender];
    }

    function approve(Fungible storage self, address owner, address spender, uint256 amount) internal {
        self._allowances[owner][spender] = amount;
    }

    struct NonFungible {
        mapping(uint256 => address) _tokenApprovals;
        mapping(address => mapping(address => bool)) _operatorApprovals;
    }

    function getApproved(NonFungible storage self, uint256 tokenId) internal view returns (address) {
        return self._tokenApprovals[tokenId];
    }

    function approve(NonFungible storage self, address spender, uint256 tokenId) internal {
        self._tokenApprovals[tokenId] = spender;
    }

    function isApprovedForAll(NonFungible storage self, address owner, address operator) internal view returns (bool) {
        return self._operatorApprovals[owner][operator];
    }

    function setApprovalForAll(NonFungible storage self, address owner, address operator, bool approved) internal {
        self._operatorApprovals[owner][operator] = approved;
    }
}
