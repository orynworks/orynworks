// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import {CapabilityRegistry} from "../src/CapabilityRegistry.sol";

contract CapabilityRegistryTest is Test {
    CapabilityRegistry registry;
    address owner = address(0xA1);
    address builder = address(0xB2);
    address other = address(0xC3);

    bytes32 constant SLUG = keccak256("aeon-research-pack");
    bytes32 constant META = keccak256("metadata-hash");

    function setUp() public {
        registry = new CapabilityRegistry(owner);
    }

    function test_register_storesAndEmits() public {
        vm.prank(builder);
        vm.expectEmit(true, true, false, true);
        emit CapabilityRegistered(SLUG, builder, CapabilityRegistry.CapType.Skill, 1_000_000);
        registry.register(SLUG, 1_000_000, CapabilityRegistry.CapType.Skill, META);

        CapabilityRegistry.Capability memory cap = registry.getCapability(SLUG);
        assertEq(cap.builder, builder);
        assertEq(cap.priceUSDC, 1_000_000);
        assertEq(uint8(cap.capType), uint8(CapabilityRegistry.CapType.Skill));
        assertEq(uint8(cap.status), uint8(CapabilityRegistry.Status.Active));
        assertEq(cap.metadataHash, META);
    }

    function test_register_doubleReverts() public {
        vm.prank(builder);
        registry.register(SLUG, 1_000_000, CapabilityRegistry.CapType.Skill, META);

        vm.prank(builder);
        vm.expectRevert(CapabilityRegistry.AlreadyRegistered.selector);
        registry.register(SLUG, 2_000_000, CapabilityRegistry.CapType.Skill, META);
    }

    function test_register_emptySlugReverts() public {
        vm.prank(builder);
        vm.expectRevert(CapabilityRegistry.InvalidSlug.selector);
        registry.register(bytes32(0), 1_000_000, CapabilityRegistry.CapType.Skill, META);
    }

    function test_update_onlyBuilderSucceeds() public {
        vm.prank(builder);
        registry.register(SLUG, 1_000_000, CapabilityRegistry.CapType.Skill, META);

        vm.prank(builder);
        registry.update(SLUG, 2_000_000, keccak256("new-meta"));
        assertEq(registry.getCapability(SLUG).priceUSDC, 2_000_000);
    }

    function test_update_notBuilderReverts() public {
        vm.prank(builder);
        registry.register(SLUG, 1_000_000, CapabilityRegistry.CapType.Skill, META);

        vm.prank(other);
        vm.expectRevert(CapabilityRegistry.NotBuilder.selector);
        registry.update(SLUG, 2_000_000, META);
    }

    function test_deprecate_onlyBuilder() public {
        vm.prank(builder);
        registry.register(SLUG, 1_000_000, CapabilityRegistry.CapType.Skill, META);

        vm.prank(builder);
        registry.deprecate(SLUG);
        assertEq(uint8(registry.getCapability(SLUG).status), uint8(CapabilityRegistry.Status.Deprecated));
    }

    function test_getCapability_nonexistentReverts() public {
        vm.expectRevert(CapabilityRegistry.NotFound.selector);
        registry.getCapability(SLUG);
    }

    function test_setOwner_onlyByCurrentOwner() public {
        address newOwner = address(0xD4);
        vm.prank(owner);
        registry.setOwner(newOwner);
        assertEq(registry.owner(), newOwner);
    }

    function test_setOwner_othersRevert() public {
        vm.prank(other);
        vm.expectRevert(CapabilityRegistry.NotOwner.selector);
        registry.setOwner(other);
    }

    event CapabilityRegistered(bytes32 indexed slug, address indexed builder, CapabilityRegistry.CapType capType, uint256 priceUSDC);
}
