// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "./utils/WithNonce.sol";
import "../Voting.sol";

bytes32 constant _DELEGATION_TYPEHASH = keccak256("Delegation(address delegatee,uint256 nonce,uint256 expiry)");

abstract contract ERC1155Votes is ERC1155, WithNonce {
    using Voting for Voting.FungibleVoting;

    // ERC1155 doesn't keep track of the summed balance for each account, so we use a voting system that includes that
    Voting.FungibleVoting private _votes;

    event DelegateChanged(address indexed delegator, address indexed fromDelegate, address indexed toDelegate);
    event DelegateVotesChanged(address indexed delegate, uint256 previousBalance, uint256 newBalance);

    function delegates(address account) public view virtual returns (address) {
        return _votes.delegates(account);
    }

    function getVotes(address account) public view returns (uint256) {
        return _votes.getVotes(account);
    }

    function getPastVotes(address account, uint256 blockNumber) public view returns (uint256) {
        return _votes.getVotesAt(account, blockNumber);
    }

    function getPastTotalSupply(uint256 blockNumber) public view returns (uint256) {
        return _votes.getTotalVotesAt(blockNumber);
    }

    function delegate(address delegatee) public virtual {
        _delegate(_msgSender(), delegatee);
    }

    function delegateBySig(
        address delegatee,
        uint256 nonce,
        uint256 expiry,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public virtual {
        require(block.timestamp <= expiry, "signature expired");
        address signer = ECDSA.recover(
            _hashTypedDataV4(keccak256(abi.encode(_DELEGATION_TYPEHASH, delegatee, nonce, expiry))),
            v,
            r,
            s
        );
        require(nonce == _useNonce(signer), "invalid nonce");
        return _delegate(signer, delegatee);
    }

    function _delegate(address delegator, address delegatee) public virtual {
        emit DelegateChanged(delegator, delegates(delegator), delegatee);
        _votes.delegate(delegator, delegatee, _hookDelegateVotesChanged);
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

    function _hookDelegateVotesChanged(address account, uint256 previousBalance, uint256 newBalance) private {
        emit DelegateVotesChanged(account, previousBalance, newBalance);
    }

    function _sum(uint256[] memory amounts) private pure returns (uint256) {
        uint256 result = 0;
        for (uint256 i = 0; i < amounts.length; ++i) {
            result += amounts[i];
        }
        return result;
    }
}