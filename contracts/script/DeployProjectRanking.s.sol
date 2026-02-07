// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/ProjectRanking.sol";

contract DeployProjectRanking is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        // Get platform fee recipient (default to deployer)
        address platformFeeRecipient = vm.envAddress("PLATFORM_FEE_RECIPIENT");

        console.log("Deploying ProjectRanking contract...");
        console.log("Deployer:", address(uint160(deployerPrivateKey)));
        console.log("Platform Fee Recipient:", platformFeeRecipient);

        vm.startBroadcast(deployerPrivateKey);

        ProjectRanking projectRanking = new ProjectRanking(platformFeeRecipient);

        vm.stopBroadcast();

        console.log("ProjectRanking deployed at:", address(projectRanking));
    }
}
