// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/governance/utils/IVotes.sol";
import "../modules/WithUserNonce.sol";
import "./utils/Voting.sol";

bytes32 constant _DELEGATION_TYPEHASH = keccak256("Delegation(address delegatee,uint256 nonce,uint256 expiry)");

abstract contract Votes is IVotes, WithUserNonce {
    using ECDSA  for bytes32;
    using Voting for Voting.Votes;

    Voting.Votes private _votes;

    /**
     * view functions
     */
    function getVotes(address account) public view virtual override returns (uint256) {
        return _votes.getVotes(account);
    }

    function getPastVotes(address account, uint256 blockNumber) public view virtual override returns (uint256) {
        return _votes.getVotesAt(account, blockNumber);
    }

    function getPastTotalSupply(uint256 blockNumber) public view virtual override returns (uint256) {
        return _votes.getTotalVotesAt(blockNumber);
    }

    function _getTotalSupply() internal view virtual returns (uint256) {
        return _votes.getTotalVotes();
    }

    function delegates(address account) public view virtual override returns (address) {
        return _votes.delegates(account);
    }

    /**
     * state-changing functions
     */
    function delegate(address delegatee) public virtual override {
        _delegate(msg.sender, delegatee);
    }

    function delegateBySig(
        address delegatee,
        uint256 nonce,
        uint256 expiry,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public virtual override {
        require(block.timestamp <= expiry, "Votes: signature expired");

        address signer = _hashTypedDataV4(keccak256(abi.encode(_DELEGATION_TYPEHASH, delegatee, nonce, expiry)))
            .recover(v, r, s);

        require(nonce == _useNonce(signer), "Votes: invalid nonce");

        _delegate(signer, delegatee);
    }

    function _delegate(address delegator, address delegatee) internal virtual {
        address oldDelegate = delegates(delegator);

        _votes.delegate(
            delegator,
            delegatee,
            _getVotingUnits(delegator),
            _hookDelegateVotesChanged
        );

        emit DelegateChanged(delegator, oldDelegate, delegatee);
    }

    function _transferVotingUnits(address from, address to, uint256 amount) internal virtual {
        if (from == address(0)) {
            _votes.mint(to, amount, _hookDelegateVotesChanged);
        } else if (to == address(0)) {
            _votes.burn(from, amount, _hookDelegateVotesChanged);
        } else {
            _votes.transfer(from, to, amount, _hookDelegateVotesChanged);
        }
    }

    function _hookDelegateVotesChanged(address delegatee, uint256 previousBalance, uint256 newBalance) internal virtual {
        emit DelegateVotesChanged(delegatee, previousBalance, newBalance);
    }

    function _getVotingUnits(address) internal view virtual returns (uint256);
}
