// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "../utils/WithNonce.sol";
import "../utils/WithDelegate.sol";
import "../Voting.sol";

abstract contract ERC1155Votes is ERC1155, WithNonce, WithDelegate {
    using Voting for Voting.FungibleVoting;

    // ERC1155 doesn't keep track of the summed balance for each account, so we use a voting system that includes that
    Voting.FungibleVoting private _votes;

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

    function _mint(
        address to,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) internal virtual override {
        super._mint(to, id, amount, data);
        _votes.mint(to, amount, _hookDelegateVotesChanged);
    }

    function _mintBatch(
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) internal virtual override {
        super._mintBatch(to, ids, amounts, data);
        _votes.mint(to, _sum(amounts), _hookDelegateVotesChanged);
    }

    function _burn(
        address from,
        uint256 id,
        uint256 amount
    ) internal virtual override {
        super._burn(from, id, amount);
        _votes.burn(from, amount, _hookDelegateVotesChanged);
    }

    function _burnBatch(
        address from,
        uint256[] memory ids,
        uint256[] memory amounts
    ) internal virtual override {
        super._burnBatch(from, ids, amounts);
        _votes.burn(from, _sum(amounts), _hookDelegateVotesChanged);
    }

    function _safeTransferFrom(
        address from,
        address to,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) internal virtual override {
        super._safeTransferFrom(from, to, id, amount, data);
        _votes.transfer(from, to, amount, _hookDelegateVotesChanged);
    }

    function _safeBatchTransferFrom(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) internal virtual override {
        super._safeBatchTransferFrom(from, to, ids, amounts, data);
        _votes.transfer(from, to, _sum(amounts), _hookDelegateVotesChanged);
    }

    function _afterDelegateChange(address delegator, address oldDelegatee, address newDelegatee) internal virtual override {
        super._afterDelegateChange(delegator, oldDelegatee, newDelegatee);
        _votes.delegate(delegator, newDelegatee, _hookDelegateVotesChanged);
    }

    function _hookDelegateVotesChanged(address account, uint256 previousBalance, uint256 newBalance) private {
        emit DelegateVotesChanged(account, previousBalance, newBalance);
    }

    function _useNonce(address owner) internal virtual override(WithNonce, WithDelegate) returns (uint256 current) {
        super._useNonce(owner);
    }

    function _sum(uint256[] memory amounts) private pure returns (uint256) {
        uint256 result = 0;
        for (uint256 i = 0; i < amounts.length; ++i) {
            result += amounts[i];
        }
        return result;
    }
}