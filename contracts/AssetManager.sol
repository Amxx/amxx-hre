// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";

library AssetManager {
    struct Asset {
        function(Asset memory, address) internal view returns (uint256) _balanceHandler;
        function(Asset memory, address, uint256) internal _transferHandler;
        bytes _data;
    }

    function getBalance(Asset memory self, address account) internal view returns (uint256) {
        return self._balanceHandler(self, account);
    }

    function sendValue(
        Asset memory self,
        address account,
        uint256 value
    ) internal {
        self._transferHandler(self, account, value);
    }

    /// ETH
    // solhint-disable-next-line func-name-mixedcase
    function ETH() internal pure returns (Asset memory result) {
        result._balanceHandler = _ethBalance;
        result._transferHandler = _ethTransfer;
    }

    function _ethBalance(
        Asset memory, /*self*/
        address account
    ) private view returns (uint256) {
        return account.balance;
    }

    function _ethTransfer(
        Asset memory, /*self*/
        address account,
        uint256 value
    ) private {
        Address.sendValue(payable(account), value);
    }

    /// ERC20
    // solhint-disable-next-line func-name-mixedcase
    function ERC20(IERC20 token) internal pure returns (Asset memory result) {
        result._balanceHandler = _erc20Balance;
        result._transferHandler = _erc20Transfer;
        result._data = abi.encode(token);
    }

    function _erc20Balance(Asset memory self, address account) private view returns (uint256) {
        return abi.decode(self._data, (IERC20)).balanceOf(account);
    }

    function _erc20Transfer(
        Asset memory self,
        address account,
        uint256 value
    ) private {
        SafeERC20.safeTransfer(abi.decode(self._data, (IERC20)), account, value);
    }

    /// ERC721
    // solhint-disable-next-line func-name-mixedcase
    function ERC721(IERC721 registry, uint256 tokenId) internal pure returns (Asset memory result) {
        result._balanceHandler = _erc721Balance;
        result._transferHandler = _erc721Transfer;
        result._data = abi.encode(registry, tokenId);
    }

    function _erc721Balance(Asset memory self, address account) private view returns (uint256) {
        (IERC721 registry, uint256 tokenId) = abi.decode(self._data, (IERC721, uint256));
        return registry.ownerOf(tokenId) == account ? 1 : 0;
    }

    function _erc721Transfer(
        Asset memory self,
        address account,
        uint256 value
    ) private {
        require(value == 1, "Asset is non-fungible");
        (IERC721 registry, uint256 tokenId) = abi.decode(self._data, (IERC721, uint256));
        registry.transferFrom(registry.ownerOf(tokenId), account, tokenId);
    }

    /// ERC1155
    // solhint-disable-next-line func-name-mixedcase
    function ERC1155(IERC1155 registry, uint256 tokenId) internal pure returns (Asset memory result) {
        result._balanceHandler = _erc1155Balance;
        result._transferHandler = _erc1155Transfer;
        result._data = abi.encode(registry, tokenId);
    }

    function _erc1155Balance(Asset memory self, address account) private view returns (uint256) {
        (IERC1155 registry, uint256 tokenId) = abi.decode(self._data, (IERC1155, uint256));
        return registry.balanceOf(account, tokenId);
    }

    function _erc1155Transfer(
        Asset memory self,
        address account,
        uint256 value
    ) private {
        (IERC1155 registry, uint256 tokenId) = abi.decode(self._data, (IERC1155, uint256));
        registry.safeTransferFrom(address(this), account, tokenId, value, new bytes(0));
    }
}
