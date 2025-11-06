// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/SupplyChainTracker.sol";

contract SupplyChainTrackerTest is Test {
    SupplyChainTracker private tracker;
    address private producer = address(0x1);
    address private factory = address(0x2);
    address private retailer = address(0x3);
    address private consumer = address(0x4);

    function setUp() public {
        tracker = new SupplyChainTracker();
    }

    function _requestAndApprove(
        address account,
        SupplyChainTracker.Role role
    ) private {
        vm.startPrank(account);
        tracker.requestRole(role);
        vm.stopPrank();
        tracker.approveRole(account);
    }

    function testRoleApprovalFlow() public {
        vm.prank(producer);
        tracker.requestRole(SupplyChainTracker.Role.Producer);
        tracker.approveRole(producer);

        SupplyChainTracker.User memory user = tracker.getUser(producer);
        assertTrue(user.approved);
        assertEq(uint8(user.role), uint8(SupplyChainTracker.Role.Producer));
    }

    function testCreateRawAsset() public {
        _requestAndApprove(producer, SupplyChainTracker.Role.Producer);

        vm.prank(producer);
        uint256 assetId = tracker.createRawAsset("ipfs://raw-material");
        assertEq(assetId, 1);

        SupplyChainTracker.Asset memory asset = tracker.getAsset(assetId);
        assertEq(asset.currentHolder, producer);
        assertEq(
            uint8(asset.currentRole),
            uint8(SupplyChainTracker.Role.Producer)
        );
        assertEq(
            uint8(asset.assetType),
            uint8(SupplyChainTracker.AssetType.RawMaterial)
        );
        assertEq(asset.parentIds.length, 0);
    }

    function testFactoryCreatesProcessedAsset() public {
        _requestAndApprove(producer, SupplyChainTracker.Role.Producer);
        _requestAndApprove(factory, SupplyChainTracker.Role.Factory);

        vm.startPrank(producer);
        uint256 rawId = tracker.createRawAsset("ipfs://raw-material");
        uint256 transferId = tracker.requestTransfer(rawId, factory);
        vm.stopPrank();

        vm.prank(factory);
        tracker.approveTransfer(transferId);

        vm.prank(factory);
        uint256 processedId = tracker.createProcessedAsset(
            "ipfs://processed",
            _toArray(rawId)
        );

        SupplyChainTracker.Asset memory processed = tracker.getAsset(
            processedId
        );
        assertEq(processed.parentIds.length, 1);
        assertEq(processed.parentIds[0], rawId);
        assertEq(
            uint8(processed.assetType),
            uint8(SupplyChainTracker.AssetType.ProcessedGood)
        );
    }

    function testFullTransferFlowAndHistory() public {
        _requestAndApprove(producer, SupplyChainTracker.Role.Producer);
        _requestAndApprove(factory, SupplyChainTracker.Role.Factory);
        _requestAndApprove(retailer, SupplyChainTracker.Role.Retailer);
        _requestAndApprove(consumer, SupplyChainTracker.Role.Consumer);

        vm.prank(producer);
        uint256 assetId = tracker.createRawAsset("ipfs://raw");

        uint256 toFactory = _requestTransferAs(producer, assetId, factory);
        vm.prank(factory);
        tracker.approveTransfer(toFactory);

        uint256 toRetailer = _requestTransferAs(factory, assetId, retailer);
        vm.prank(retailer);
        tracker.approveTransfer(toRetailer);

        uint256 toConsumer = _requestTransferAs(retailer, assetId, consumer);
        vm.prank(consumer);
        tracker.approveTransfer(toConsumer);

        SupplyChainTracker.Asset memory asset = tracker.getAsset(assetId);
        assertEq(asset.currentHolder, consumer);
        assertEq(
            uint8(asset.currentRole),
            uint8(SupplyChainTracker.Role.Consumer)
        );

        SupplyChainTracker.Transfer[] memory history = tracker
            .getAssetTransfers(assetId);
        assertEq(history.length, 3);
        assertEq(
            uint8(history[0].status),
            uint8(SupplyChainTracker.TransferStatus.Approved)
        );
        assertEq(history[0].assetId, assetId);
        assertEq(history[2].to, consumer);
    }

    function _requestTransferAs(
        address caller,
        uint256 assetId,
        address to
    ) private returns (uint256) {
        vm.prank(caller);
        return tracker.requestTransfer(assetId, to);
    }

    function _toArray(
        uint256 value
    ) private pure returns (uint256[] memory result) {
        result = new uint256[](1);
        result[0] = value;
    }
}
