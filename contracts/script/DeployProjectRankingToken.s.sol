// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/ProjectRankingToken.sol";

contract DeployProjectRankingToken is Script {
    //ROAD_TOKEN address on Base
    address constant ROAD_TOKEN = 0xC7aABA6E953A1c0436295CFaAAeA9B3aB475EB07;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        // Get platform fee recipient (default to deployer)
        address platformFeeRecipient = vm.envAddress("PLATFORM_FEE_RECIPIENT");

        console.log("Deploying ProjectRankingToken contract...");
        console.log("Deployer:", address(uint160(deployerPrivateKey)));
        console.log("Platform Fee Recipient:", platformFeeRecipient);
        console.log("ROAD Token:", ROAD_TOKEN);

        vm.startBroadcast(deployerPrivateKey);

        ProjectRankingToken projectRanking = new ProjectRankingToken(platformFeeRecipient, ROAD_TOKEN);

        vm.stopBroadcast();

        console.log("ProjectRankingToken deployed at:", address(projectRanking));
    }
}
