// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import {RevenueEscrow} from "../src/RevenueEscrow.sol";

contract MockUSDC {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function mint(address to, uint256 amount) external { balanceOf[to] += amount; }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "insufficient");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(allowance[from][msg.sender] >= amount, "no allowance");
        require(balanceOf[from] >= amount, "insufficient");
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}

contract RevenueEscrowTest is Test {
    RevenueEscrow escrow;
    MockUSDC usdc;
    address owner = address(0xA1);
    address builder = address(0xB2);
    address other = address(0xC3);
    address gateway = address(0xD4);

    function setUp() public {
        usdc = new MockUSDC();
        escrow = new RevenueEscrow(address(usdc), owner);
        usdc.mint(gateway, 1_000_000 * 1e6); // 1M USDC
        vm.prank(gateway);
        usdc.approve(address(escrow), type(uint256).max);
    }

    function test_settle_splits90_10() public {
        vm.prank(gateway);
        escrow.settle(builder, 100 * 1e6);
        assertEq(escrow.builderBalance(builder), 90 * 1e6);
        assertEq(escrow.protocolTreasury(), 10 * 1e6);
        assertEq(usdc.balanceOf(address(escrow)), 100 * 1e6);
    }

    function test_claim_transfersAndResets() public {
        vm.prank(gateway);
        escrow.settle(builder, 100 * 1e6);

        vm.prank(builder);
        escrow.claim();
        assertEq(usdc.balanceOf(builder), 90 * 1e6);
        assertEq(escrow.builderBalance(builder), 0);
    }

    function test_claim_zeroBalanceReverts() public {
        vm.prank(builder);
        vm.expectRevert(RevenueEscrow.InsufficientBalance.selector);
        escrow.claim();
    }

    function test_withdrawProtocol_ownerOnly() public {
        vm.prank(gateway);
        escrow.settle(builder, 100 * 1e6);

        vm.prank(owner);
        escrow.withdrawProtocol(other, 10 * 1e6);
        assertEq(usdc.balanceOf(other), 10 * 1e6);
        assertEq(escrow.protocolTreasury(), 0);
    }

    function test_withdrawProtocol_notOwnerReverts() public {
        vm.prank(gateway);
        escrow.settle(builder, 100 * 1e6);

        vm.prank(other);
        vm.expectRevert(RevenueEscrow.NotOwner.selector);
        escrow.withdrawProtocol(other, 10 * 1e6);
    }

    function test_setOwner_onlyOwner() public {
        vm.prank(owner);
        escrow.setOwner(other);
        assertEq(escrow.owner(), other);
    }

    function test_setOwner_zeroReverts() public {
        vm.prank(owner);
        vm.expectRevert(RevenueEscrow.ZeroAddress.selector);
        escrow.setOwner(address(0));
    }

    function test_settle_zeroBuilderReverts() public {
        vm.prank(gateway);
        vm.expectRevert(RevenueEscrow.ZeroAddress.selector);
        escrow.settle(address(0), 100 * 1e6);
    }
}
