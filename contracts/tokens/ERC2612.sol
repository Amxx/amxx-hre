// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/interfaces/draft-IERC2612.sol";
import "../modules/WithUserNonce.sol";
import "./ERC20.sol";

bytes32 constant _PERMIT_TYPEHASH = keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");

abstract contract ERC2612 is IERC2612, ERC20, WithUserNonce {
    using ECDSA for bytes32;

    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return interfaceId == type(IERC2612).interfaceId || super.supportsInterface(interfaceId);
    }

    function DOMAIN_SEPARATOR() public view virtual override(IERC20Permit) returns (bytes32) {
        return _domainSeparatorV4();
    }

    function nonces(address owner) public view virtual override(IERC20Permit, WithUserNonce) returns (uint256) {
        return super.nonces(owner);
    }

    function permit(
        address owner,
        address spender,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public virtual override {
        require(block.timestamp <= deadline, "ERC20Permit: expired deadline");

        address signer = ECDSA.recover(
            _hashTypedDataV4(keccak256(abi.encode(
                _PERMIT_TYPEHASH,
                owner,
                spender,
                value,
                _useNonce(owner),
                deadline
            ))),
            v,
            r,
            s
        );

        require(signer == owner, "ERC20Permit: invalid signature");

        _approve(owner, spender, value);
    }
}