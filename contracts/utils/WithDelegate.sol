// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/utils/cryptography/draft-EIP712.sol";

bytes32 constant _DELEGATION_TYPEHASH = keccak256("Delegation(address delegatee,uint256 nonce,uint256 expiry)");

abstract contract WithDelegate is Context, EIP712 {
    mapping(address => address) private _delegates;

    event DelegateChanged(address indexed delegator, address indexed fromDelegate, address indexed toDelegate);

    function delegates(address account) public view virtual returns (address) {
        return _delegates[account];
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

    function _delegate(address delegator, address delegatee) internal virtual {
        address oldDelegatee = _delegates[delegator];
        _delegates[delegator] = delegatee;
        _afterDelegateChange(delegator, oldDelegatee, delegatee);
    }

    function _afterDelegateChange(address delegator, address oldDelegatee, address newDelegatee) internal virtual {
        emit DelegateChanged(delegator, oldDelegatee, newDelegatee);
    }

    function _useNonce(address owner) internal virtual returns (uint256 current);
}