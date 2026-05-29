// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

contract RevenueEscrow {
    IERC20 public immutable usdc;
    address public owner;
    uint256 public protocolTreasury;
    mapping(address => uint256) public builderBalance;

    uint256 public constant BUILDER_BPS = 9000;
    uint256 public constant PROTOCOL_BPS = 1000;

    event Settled(address indexed builder, uint256 amountUSDC, uint256 builderShare, uint256 protocolShare);
    event Claimed(address indexed builder, uint256 amountUSDC);
    event ProtocolWithdrawn(address indexed to, uint256 amountUSDC);
    event OwnerUpdated(address indexed oldOwner, address indexed newOwner);

    error InsufficientBalance();
    error NotOwner();
    error TransferFailed();
    error ZeroAddress();

    constructor(address _usdc, address _owner) {
        if (_usdc == address(0) || _owner == address(0)) revert ZeroAddress();
        usdc = IERC20(_usdc);
        owner = _owner;
    }

    function settle(address builder, uint256 amountUSDC) external {
        if (builder == address(0)) revert ZeroAddress();
        if (!usdc.transferFrom(msg.sender, address(this), amountUSDC)) revert TransferFailed();
        uint256 builderShare = (amountUSDC * BUILDER_BPS) / 10000;
        uint256 protocolShare = amountUSDC - builderShare;
        builderBalance[builder] += builderShare;
        protocolTreasury += protocolShare;
        emit Settled(builder, amountUSDC, builderShare, protocolShare);
    }

    function claim() external {
        uint256 amt = builderBalance[msg.sender];
        if (amt == 0) revert InsufficientBalance();
        builderBalance[msg.sender] = 0;
        if (!usdc.transfer(msg.sender, amt)) revert TransferFailed();
        emit Claimed(msg.sender, amt);
    }

    function withdrawProtocol(address to, uint256 amount) external {
        if (msg.sender != owner) revert NotOwner();
        if (amount > protocolTreasury) revert InsufficientBalance();
        if (to == address(0)) revert ZeroAddress();
        protocolTreasury -= amount;
        if (!usdc.transfer(to, amount)) revert TransferFailed();
        emit ProtocolWithdrawn(to, amount);
    }

    function setOwner(address newOwner) external {
        if (msg.sender != owner) revert NotOwner();
        if (newOwner == address(0)) revert ZeroAddress();
        address oldOwner = owner;
        owner = newOwner;
        emit OwnerUpdated(oldOwner, newOwner);
    }
}
