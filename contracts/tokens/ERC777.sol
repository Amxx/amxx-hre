// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/interfaces/IERC777.sol";
import "@openzeppelin/contracts/interfaces/IERC777Recipient.sol";
import "@openzeppelin/contracts/interfaces/IERC777Sender.sol";
import "@openzeppelin/contracts/interfaces/IERC1820Registry.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "./ERC20.sol";

IERC1820Registry constant _ERC1820_REGISTRY                = IERC1820Registry(0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24);
bytes32          constant _TOKENS_SENDER_INTERFACE_HASH    = keccak256("ERC777TokensSender");
bytes32          constant _TOKENS_RECIPIENT_INTERFACE_HASH = keccak256("ERC777TokensRecipient");

abstract contract ERC777 is IERC777, ERC20 {
    // This isn't ever read from - it's only used to respond to the defaultOperators query.
    address[] private _defaultOperatorsArray;

    // Immutable, but accounts may revoke them (tracked in __revokedDefaultOperators).
    mapping(address => bool) private _defaultOperators;

    // For each account, a mapping of its operators and revoked default operators.
    mapping(address => mapping(address => bool)) private _operators;
    mapping(address => mapping(address => bool)) private _revokedDefaultOperators;


    constructor(address[] memory defaultOperators_) {
        _defaultOperatorsArray = defaultOperators_;
        for (uint256 i = 0; i < defaultOperators_.length; ++i) {
            _defaultOperators[defaultOperators_[i]] = true;
        }

        // register interfaces
        _ERC1820_REGISTRY.setInterfaceImplementer(address(this), keccak256("ERC20Token"),  address(this));
        _ERC1820_REGISTRY.setInterfaceImplementer(address(this), keccak256("ERC777Token"), address(this));
    }

    function name() public view virtual override(IERC777, ERC20) returns (string memory) {
        return super.name();
    }

    function symbol() public view virtual override(IERC777, ERC20) returns (string memory) {
        return super.symbol();
    }

    function balanceOf(address account) public view virtual override(IERC777, ERC20) returns (uint256) {
        return super.balanceOf(account);
    }

    function totalSupply() public view virtual override(IERC777, ERC20) returns (uint256) {
        return super.totalSupply();
    }

    function granularity() public view virtual returns (uint256) {
        return 1;
    }

    function send(address recipient, uint256 amount, bytes calldata data) public virtual override {
        _send(msg.sender, recipient, amount, data, "", true);
    }

    function burn(uint256 amount, bytes calldata data) public virtual override {
        _burn(msg.sender, amount, data, "");
    }

    function isOperatorFor(address operator, address tokenHolder) public view virtual override returns (bool) {
        return operator == tokenHolder
            || (_defaultOperators[operator] && !_revokedDefaultOperators[tokenHolder][operator])
            || _operators[tokenHolder][operator];
    }

    function authorizeOperator(address operator) public virtual override {
        require(msg.sender != operator, "ERC777: authorizing self as operator");

        if (_defaultOperators[operator]) {
            delete _revokedDefaultOperators[msg.sender][operator];
        } else {
            _operators[msg.sender][operator] = true;
        }

        emit AuthorizedOperator(operator, msg.sender);
    }

    function revokeOperator(address operator) public virtual override {
        require(msg.sender != operator, "ERC777: revoking self as operator");

        if (_defaultOperators[operator]) {
            _revokedDefaultOperators[msg.sender][operator] = true;
        } else {
            delete _operators[msg.sender][operator];
        }

        emit RevokedOperator(operator, msg.sender);
    }

    function defaultOperators() public view virtual override returns (address[] memory) {
        return _defaultOperatorsArray;
    }

    function operatorSend(
        address sender,
        address recipient,
        uint256 amount,
        bytes memory data,
        bytes memory operatorData
    ) public virtual override {
        require(isOperatorFor(msg.sender, sender), "ERC777: caller is not an operator for holder");
        _send(sender, recipient, amount, data, operatorData, true);
    }

    function operatorBurn(
        address account,
        uint256 amount,
        bytes memory data,
        bytes memory operatorData
    ) public virtual override {
        require(isOperatorFor(msg.sender, account), "ERC777: caller is not an operator for holder");
        _burn(account, amount, data, operatorData);
    }

    /**
     * hook into ERC20
     */
    function _transfer(address from, address to, uint256 amount) internal virtual override {
        _send(from, to, amount, new bytes(0), new bytes(0), false);
    }

    function _mint(address to, uint256 amount) internal virtual override {
        _mint(to, amount, new bytes(0), new bytes(0), false);
    }

    function _burn(address from, uint256 amount) internal virtual override {
        _burn(from, amount, new bytes(0), new bytes(0));
    }

    function _send(
        address from,
        address to,
        uint256 amount,
        bytes memory userData,
        bytes memory operatorData,
        bool requireReceptionAck
    ) internal virtual {
        _callTokensToSend(msg.sender, from, to, amount, userData, operatorData);

        super._transfer(from, to, amount);
        emit Sent(msg.sender, from, to, amount, userData, operatorData);

        _callTokensReceived(msg.sender, from, to, amount, userData, operatorData, requireReceptionAck);
    }

    function _mint(
        address to,
        uint256 amount,
        bytes memory userData,
        bytes memory operatorData,
        bool requireReceptionAck
    ) internal virtual {
        super._mint(to, amount);
        emit Minted(msg.sender, to, amount, userData, operatorData);

        _callTokensReceived(msg.sender, address(0), to, amount, userData, operatorData, requireReceptionAck);
    }

    function _burn(
        address from,
        uint256 amount,
        bytes memory userData,
        bytes memory operatorData
    ) internal virtual {
        _callTokensToSend(msg.sender, from, address(0), amount, userData, operatorData);

        super._burn(from, amount);
        emit Burned(msg.sender, from, amount, userData, operatorData);
    }

    function _callTokensToSend(
        address operator,
        address from,
        address to,
        uint256 amount,
        bytes memory userData,
        bytes memory operatorData
    ) private {
        address implementer = _ERC1820_REGISTRY.getInterfaceImplementer(from, _TOKENS_SENDER_INTERFACE_HASH);
        if (implementer != address(0)) {
            IERC777Sender(implementer).tokensToSend(operator, from, to, amount, userData, operatorData);
        }
    }

    function _callTokensReceived(
        address operator,
        address from,
        address to,
        uint256 amount,
        bytes memory userData,
        bytes memory operatorData,
        bool requireReceptionAck
    ) private {
        address implementer = _ERC1820_REGISTRY.getInterfaceImplementer(to, _TOKENS_RECIPIENT_INTERFACE_HASH);
        if (implementer != address(0)) {
            IERC777Recipient(implementer).tokensReceived(operator, from, to, amount, userData, operatorData);
        } else if (requireReceptionAck) {
            require(!Address.isContract(to), "ERC777: token recipient contract has no implementer for ERC777TokensRecipient");
        }
    }
}
