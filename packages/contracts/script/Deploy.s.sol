// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {CapabilityRegistry} from "../src/CapabilityRegistry.sol";
import {RevenueEscrow} from "../src/RevenueEscrow.sol";

contract Deploy is Script {
    function run() external {
        uint256 deployerPK = vm.envUint("PRIVATE_KEY");
        address owner = vm.envAddress("PROTOCOL_OWNER");
        address usdc = vm.envAddress("USDC_ADDRESS");

        vm.startBroadcast(deployerPK);

        CapabilityRegistry registry = new CapabilityRegistry(owner);
        RevenueEscrow escrow = new RevenueEscrow(usdc, owner);

        vm.stopBroadcast();

        console.log("CapabilityRegistry deployed to:", address(registry));
        console.log("RevenueEscrow deployed to:    ", address(escrow));
        console.log("Owner:                        ", owner);
        console.log("USDC:                         ", usdc);
    }
}
