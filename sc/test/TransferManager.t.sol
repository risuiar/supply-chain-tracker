// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/RoleManager.sol";
import "../src/TokenFactory.sol";
import "../src/TransferManager.sol";

/// @title TransferManager Test Suite
/// @notice Comprehensive tests for the TransferManager contract
contract TransferManagerTest is Test {
    RoleManager public roleManager;
    TokenFactory public tokenFactory;
    TransferManager public transferManager;
    
    address public admin;
    address public producer;
    address public factory;
    address public retailer;
    address public consumer;
    
    event TransferRequested(uint256 indexed tokenId, uint256 indexed transferId, address indexed to);
    event TransferResolved(uint256 indexed transferId, TransferManager.TransferStatus status);
    
    function setUp() public {
        admin = address(this);
        producer = makeAddr("producer");
        factory = makeAddr("factory");
        retailer = makeAddr("retailer");
        consumer = makeAddr("consumer");
        
        roleManager = new RoleManager();
        tokenFactory = new TokenFactory(address(roleManager));
        transferManager = new TransferManager(address(roleManager), address(tokenFactory));
        
        // Approve all users
        vm.prank(producer);
        roleManager.requestRole(RoleManager.Role.Producer);
        roleManager.approveRole(producer);
        
        vm.prank(factory);
        roleManager.requestRole(RoleManager.Role.Factory);
        roleManager.approveRole(factory);
        
        vm.prank(retailer);
        roleManager.requestRole(RoleManager.Role.Retailer);
        roleManager.approveRole(retailer);
        
        vm.prank(consumer);
        roleManager.requestRole(RoleManager.Role.Consumer);
        roleManager.approveRole(consumer);
    }
    
    // ============ Transfer Request Tests ============
    
    function testProducerCanRequestTransferToFactory() public {
        vm.prank(producer);
        uint256 tokenId = tokenFactory.createRawToken("Coffee", "", 1000);
        
        vm.expectEmit(true, true, true, false);
        emit TransferRequested(tokenId, 1, factory);
        
        vm.prank(producer);
        uint256 transferId = transferManager.requestTransfer(tokenId, factory, 500);
        
        assertEq(transferId, 1);
        
        TransferManager.Transfer memory transfer = transferManager.getTransfer(transferId);
        assertEq(transfer.tokenId, tokenId);
        assertEq(transfer.from, producer);
        assertEq(transfer.to, factory);
        assertEq(transfer.amount, 500);
        assertEq(uint8(transfer.status), uint8(TransferManager.TransferStatus.Pending));
    }
    
    function testFactoryCanRequestTransferToRetailer() public {
        // Setup: Producer creates and transfers to Factory
        vm.prank(producer);
        uint256 rawToken = tokenFactory.createRawToken("Leather", "", 100);
        
        vm.prank(producer);
        tokenFactory.transferToken(rawToken, producer, factory, 50);
        
        // Factory creates processed token
        uint256[] memory parentIds = new uint256[](1);
        parentIds[0] = rawToken;
        
        vm.prank(factory);
        uint256 processedToken = tokenFactory.createProcessedToken("Wallet", "", 10, parentIds);
        
        // Factory requests transfer to Retailer
        vm.prank(factory);
        uint256 transferId = transferManager.requestTransfer(processedToken, retailer, 5);
        
        TransferManager.Transfer memory transfer = transferManager.getTransfer(transferId);
        assertEq(transfer.from, factory);
        assertEq(transfer.to, retailer);
        assertEq(uint8(transfer.fromRole), uint8(RoleManager.Role.Factory));
        assertEq(uint8(transfer.toRole), uint8(RoleManager.Role.Retailer));
    }
    
    function testRetailerCanRequestTransferToConsumer() public {
        // Setup: Create token and get it to retailer
        vm.prank(producer);
        uint256 rawToken = tokenFactory.createRawToken("Leather", "", 100);
        
        vm.prank(producer);
        tokenFactory.transferToken(rawToken, producer, factory, 50);
        
        uint256[] memory parentIds = new uint256[](1);
        parentIds[0] = rawToken;
        
        vm.prank(factory);
        uint256 processedToken = tokenFactory.createProcessedToken("Wallet", "", 10, parentIds);
        
        vm.prank(factory);
        tokenFactory.transferToken(processedToken, factory, retailer, 5);
        
        // Retailer requests transfer to Consumer
        vm.prank(retailer);
        uint256 transferId = transferManager.requestTransfer(processedToken, consumer, 2);
        
        TransferManager.Transfer memory transfer = transferManager.getTransfer(transferId);
        assertEq(transfer.to, consumer);
        assertEq(uint8(transfer.toRole), uint8(RoleManager.Role.Consumer));
    }
    
    function testProducerCannotTransferToRetailer() public {
        vm.prank(producer);
        uint256 tokenId = tokenFactory.createRawToken("Coffee", "", 1000);
        
        vm.expectRevert(TransferManager.InvalidRoleTransition.selector);
        vm.prank(producer);
        transferManager.requestTransfer(tokenId, retailer, 500);
    }
    
    function testFactoryCannotTransferToConsumer() public {
        vm.prank(producer);
        uint256 rawToken = tokenFactory.createRawToken("Leather", "", 100);
        
        vm.prank(producer);
        tokenFactory.transferToken(rawToken, producer, factory, 50);
        
        uint256[] memory parentIds = new uint256[](1);
        parentIds[0] = rawToken;
        
        vm.prank(factory);
        uint256 processedToken = tokenFactory.createProcessedToken("Wallet", "", 10, parentIds);
        
        vm.expectRevert(TransferManager.InvalidRoleTransition.selector);
        vm.prank(factory);
        transferManager.requestTransfer(processedToken, consumer, 5);
    }
    
    function testConsumerCannotTransferTokens() public {
        // Setup: Get token to consumer
        vm.prank(producer);
        uint256 rawToken = tokenFactory.createRawToken("Leather", "", 100);
        
        vm.prank(producer);
        tokenFactory.transferToken(rawToken, producer, factory, 50);
        
        uint256[] memory parentIds = new uint256[](1);
        parentIds[0] = rawToken;
        
        vm.prank(factory);
        uint256 processedToken = tokenFactory.createProcessedToken("Wallet", "", 10, parentIds);
        
        vm.prank(factory);
        tokenFactory.transferToken(processedToken, factory, retailer, 5);
        
        vm.prank(retailer);
        tokenFactory.transferToken(processedToken, retailer, consumer, 2);
        
        // Consumer tries to transfer (should fail - no valid next role)
        vm.expectRevert(TransferManager.InvalidRoleTransition.selector);
        vm.prank(consumer);
        transferManager.requestTransfer(processedToken, producer, 1);
    }
    
    function testCannotTransferWithInsufficientBalance() public {
        vm.prank(producer);
        uint256 tokenId = tokenFactory.createRawToken("Coffee", "", 1000);
        
        vm.expectRevert(TransferManager.Unauthorized.selector);
        vm.prank(producer);
        transferManager.requestTransfer(tokenId, factory, 2000);
    }
    
    function testCannotTransferZeroAmount() public {
        vm.prank(producer);
        uint256 tokenId = tokenFactory.createRawToken("Coffee", "", 1000);
        
        vm.expectRevert(TransferManager.InvalidAmount.selector);
        vm.prank(producer);
        transferManager.requestTransfer(tokenId, factory, 0);
    }
    
    function testCannotTransferToZeroAddress() public {
        vm.prank(producer);
        uint256 tokenId = tokenFactory.createRawToken("Coffee", "", 1000);
        
        vm.expectRevert(TransferManager.InvalidAddress.selector);
        vm.prank(producer);
        transferManager.requestTransfer(tokenId, address(0), 500);
    }
    
    function testUnapprovedUserCannotTransfer() public {
        vm.prank(producer);
        uint256 tokenId = tokenFactory.createRawToken("Coffee", "", 1000);
        
        address unapproved = makeAddr("unapproved");
        
        // Unapproved user gets Unauthorized error (from insufficient balance check before role check)
        vm.expectRevert(TransferManager.Unauthorized.selector);
        vm.prank(unapproved);
        transferManager.requestTransfer(tokenId, factory, 100);
    }
    
    // ============ Role-Based Transfer Validation Tests ============
    
    function testProducerCanOnlyTransferRawMaterialTheyCreated() public {
        // Producer 1 creates token
        address producer2 = makeAddr("producer2");
        vm.prank(producer2);
        roleManager.requestRole(RoleManager.Role.Producer);
        roleManager.approveRole(producer2);
        
        vm.prank(producer);
        uint256 tokenId = tokenFactory.createRawToken("Coffee", "", 1000);
        
        // Transfer some to producer2
        vm.prank(producer);
        tokenFactory.transferToken(tokenId, producer, producer2, 100);
        
        // Producer2 tries to transfer but didn't create it
        vm.expectRevert(TransferManager.NotTokenCreator.selector);
        vm.prank(producer2);
        transferManager.requestTransfer(tokenId, factory, 50);
    }
    
    function testProducerCannotTransferProcessedGoods() public {
        vm.prank(producer);
        uint256 rawToken = tokenFactory.createRawToken("Leather", "", 100);
        
        vm.prank(producer);
        tokenFactory.transferToken(rawToken, producer, factory, 50);
        
        uint256[] memory parentIds = new uint256[](1);
        parentIds[0] = rawToken;
        
        vm.prank(factory);
        uint256 processedToken = tokenFactory.createProcessedToken("Wallet", "", 10, parentIds);
        
        // Transfer processed token to producer
        vm.prank(factory);
        tokenFactory.transferToken(processedToken, factory, producer, 5);
        
        // Producer tries to transfer processed token (not creator, so should fail with NotTokenCreator)
        vm.expectRevert(TransferManager.NotTokenCreator.selector);
        vm.prank(producer);
        transferManager.requestTransfer(processedToken, factory, 2);
    }
    
    function testFactoryCanOnlyTransferProcessedGoodsTheyCreated() public {
        vm.prank(producer);
        uint256 rawToken = tokenFactory.createRawToken("Leather", "", 100);
        
        vm.prank(producer);
        tokenFactory.transferToken(rawToken, producer, factory, 50);
        
        // Factory tries to transfer raw material
        vm.expectRevert(TransferManager.NotTokenCreator.selector);
        vm.prank(factory);
        transferManager.requestTransfer(rawToken, retailer, 10);
    }
    
    function testRetailerCanTransferAnyToken() public {
        // Get both raw and processed tokens to retailer
        vm.prank(producer);
        uint256 rawToken = tokenFactory.createRawToken("Leather", "", 100);
        
        vm.prank(producer);
        tokenFactory.transferToken(rawToken, producer, factory, 50);
        
        uint256[] memory parentIds = new uint256[](1);
        parentIds[0] = rawToken;
        
        vm.prank(factory);
        uint256 processedToken = tokenFactory.createProcessedToken("Wallet", "", 10, parentIds);
        
        vm.prank(factory);
        tokenFactory.transferToken(processedToken, factory, retailer, 5);
        
        vm.prank(factory);
        tokenFactory.transferToken(rawToken, factory, retailer, 10);
        
        // Retailer can transfer processed token
        vm.prank(retailer);
        uint256 transfer1 = transferManager.requestTransfer(processedToken, consumer, 2);
        assertEq(transfer1, 1);
        
        // Retailer can also transfer raw material
        vm.prank(retailer);
        uint256 transfer2 = transferManager.requestTransfer(rawToken, consumer, 5);
        assertEq(transfer2, 2);
    }
    
    // ============ Approval Tests ============
    
    function testRecipientCanApproveTransfer() public {
        vm.prank(producer);
        uint256 tokenId = tokenFactory.createRawToken("Coffee", "", 1000);
        
        vm.prank(producer);
        uint256 transferId = transferManager.requestTransfer(tokenId, factory, 500);
        
        vm.expectEmit(true, false, false, true);
        emit TransferResolved(transferId, TransferManager.TransferStatus.Approved);
        
        vm.prank(factory);
        transferManager.approveTransfer(transferId);
        
        TransferManager.Transfer memory transfer = transferManager.getTransfer(transferId);
        assertEq(uint8(transfer.status), uint8(TransferManager.TransferStatus.Approved));
        
        // Verify balances updated
        assertEq(tokenFactory.balanceOf(tokenId, producer), 500);
        assertEq(tokenFactory.balanceOf(tokenId, factory), 500);
    }
    
    function testAdminCanApproveTransfer() public {
        vm.prank(producer);
        uint256 tokenId = tokenFactory.createRawToken("Coffee", "", 1000);
        
        vm.prank(producer);
        uint256 transferId = transferManager.requestTransfer(tokenId, factory, 500);
        
        // Admin approves instead of recipient
        transferManager.approveTransfer(transferId);
        
        TransferManager.Transfer memory transfer = transferManager.getTransfer(transferId);
        assertEq(uint8(transfer.status), uint8(TransferManager.TransferStatus.Approved));
    }
    
    function testUnauthorizedCannotApprove() public {
        vm.prank(producer);
        uint256 tokenId = tokenFactory.createRawToken("Coffee", "", 1000);
        
        vm.prank(producer);
        uint256 transferId = transferManager.requestTransfer(tokenId, factory, 500);
        
        vm.expectRevert(TransferManager.Unauthorized.selector);
        vm.prank(retailer);
        transferManager.approveTransfer(transferId);
    }
    
    function testCannotApproveNonPendingTransfer() public {
        vm.prank(producer);
        uint256 tokenId = tokenFactory.createRawToken("Coffee", "", 1000);
        
        vm.prank(producer);
        uint256 transferId = transferManager.requestTransfer(tokenId, factory, 500);
        
        vm.prank(factory);
        transferManager.approveTransfer(transferId);
        
        // Try to approve again
        vm.expectRevert(TransferManager.TransferNotPending.selector);
        vm.prank(factory);
        transferManager.approveTransfer(transferId);
    }
    
    // ============ Rejection Tests ============
    
    function testRecipientCanRejectTransfer() public {
        vm.prank(producer);
        uint256 tokenId = tokenFactory.createRawToken("Coffee", "", 1000);
        
        vm.prank(producer);
        uint256 transferId = transferManager.requestTransfer(tokenId, factory, 500);
        
        vm.expectEmit(true, false, false, true);
        emit TransferResolved(transferId, TransferManager.TransferStatus.Rejected);
        
        vm.prank(factory);
        transferManager.rejectTransfer(transferId);
        
        TransferManager.Transfer memory transfer = transferManager.getTransfer(transferId);
        assertEq(uint8(transfer.status), uint8(TransferManager.TransferStatus.Rejected));
        
        // Verify balances unchanged
        assertEq(tokenFactory.balanceOf(tokenId, producer), 1000);
        assertEq(tokenFactory.balanceOf(tokenId, factory), 0);
    }
    
    function testAdminCanRejectTransfer() public {
        vm.prank(producer);
        uint256 tokenId = tokenFactory.createRawToken("Coffee", "", 1000);
        
        vm.prank(producer);
        uint256 transferId = transferManager.requestTransfer(tokenId, factory, 500);
        
        transferManager.rejectTransfer(transferId);
        
        TransferManager.Transfer memory transfer = transferManager.getTransfer(transferId);
        assertEq(uint8(transfer.status), uint8(TransferManager.TransferStatus.Rejected));
    }
    
    function testUnauthorizedCannotReject() public {
        vm.prank(producer);
        uint256 tokenId = tokenFactory.createRawToken("Coffee", "", 1000);
        
        vm.prank(producer);
        uint256 transferId = transferManager.requestTransfer(tokenId, factory, 500);
        
        vm.expectRevert(TransferManager.Unauthorized.selector);
        vm.prank(retailer);
        transferManager.rejectTransfer(transferId);
    }
    
    // ============ Pending Transfer Tests ============
    
    function testCannotRequestTransferWhenOnePending() public {
        vm.prank(producer);
        uint256 tokenId = tokenFactory.createRawToken("Coffee", "", 1000);
        
        vm.prank(producer);
        transferManager.requestTransfer(tokenId, factory, 500);
        
        vm.expectRevert(TransferManager.TransferAlreadyPending.selector);
        vm.prank(producer);
        transferManager.requestTransfer(tokenId, factory, 300);
    }
    
    function testCanRequestNewTransferAfterApproval() public {
        vm.prank(producer);
        uint256 tokenId = tokenFactory.createRawToken("Coffee", "", 1000);
        
        vm.prank(producer);
        uint256 transferId1 = transferManager.requestTransfer(tokenId, factory, 500);
        
        vm.prank(factory);
        transferManager.approveTransfer(transferId1);
        
        // Now can request another transfer
        vm.prank(producer);
        uint256 transferId2 = transferManager.requestTransfer(tokenId, factory, 300);
        assertEq(transferId2, 2);
    }
    
    function testCanRequestNewTransferAfterRejection() public {
        vm.prank(producer);
        uint256 tokenId = tokenFactory.createRawToken("Coffee", "", 1000);
        
        vm.prank(producer);
        uint256 transferId1 = transferManager.requestTransfer(tokenId, factory, 500);
        
        vm.prank(factory);
        transferManager.rejectTransfer(transferId1);
        
        // Now can request another transfer
        vm.prank(producer);
        uint256 transferId2 = transferManager.requestTransfer(tokenId, factory, 300);
        assertEq(transferId2, 2);
    }
    
    function testGetPendingTransferReturnsCorrectId() public {
        vm.prank(producer);
        uint256 tokenId = tokenFactory.createRawToken("Coffee", "", 1000);
        
        vm.prank(producer);
        uint256 transferId = transferManager.requestTransfer(tokenId, factory, 500);
        
        uint256 pendingId = transferManager.getPendingTransfer(tokenId);
        assertEq(pendingId, transferId);
    }
    
    function testGetPendingTransferReturnsZeroWhenNone() public {
        vm.prank(producer);
        uint256 tokenId = tokenFactory.createRawToken("Coffee", "", 1000);
        
        uint256 pendingId = transferManager.getPendingTransfer(tokenId);
        assertEq(pendingId, 0);
    }
    
    // ============ Token Transfer History Tests ============
    
    function testGetTokenTransfersReturnsHistory() public {
        vm.prank(producer);
        uint256 tokenId = tokenFactory.createRawToken("Coffee", "", 1000);
        
        vm.prank(producer);
        uint256 transfer1 = transferManager.requestTransfer(tokenId, factory, 500);
        
        vm.prank(factory);
        transferManager.approveTransfer(transfer1);
        
        vm.prank(producer);
        uint256 transfer2 = transferManager.requestTransfer(tokenId, factory, 300);
        
        TransferManager.Transfer[] memory history = transferManager.getTokenTransfers(tokenId);
        assertEq(history.length, 2);
        assertEq(history[0].id, transfer1);
        assertEq(history[1].id, transfer2);
    }
    
    // ============ Complete Flow Tests ============
    
    function testCompleteSupplyChainTransferFlow() public {
        // Producer creates raw material
        vm.prank(producer);
        uint256 rawToken = tokenFactory.createRawToken("Leather", "", 1000);
        
        // Producer -> Factory
        vm.prank(producer);
        uint256 transfer1 = transferManager.requestTransfer(rawToken, factory, 500);
        
        vm.prank(factory);
        transferManager.approveTransfer(transfer1);
        
        // Factory creates processed token
        uint256[] memory parentIds = new uint256[](1);
        parentIds[0] = rawToken;
        
        vm.prank(factory);
        uint256 processedToken = tokenFactory.createProcessedToken("Wallet", "", 100, parentIds);
        
        // Factory -> Retailer
        vm.prank(factory);
        uint256 transfer2 = transferManager.requestTransfer(processedToken, retailer, 50);
        
        vm.prank(retailer);
        transferManager.approveTransfer(transfer2);
        
        // Retailer -> Consumer
        vm.prank(retailer);
        uint256 transfer3 = transferManager.requestTransfer(processedToken, consumer, 10);
        
        vm.prank(consumer);
        transferManager.approveTransfer(transfer3);
        
        // Verify final state
        assertEq(tokenFactory.balanceOf(rawToken, producer), 500);
        assertEq(tokenFactory.balanceOf(rawToken, factory), 500);
        assertEq(tokenFactory.balanceOf(processedToken, factory), 50);
        assertEq(tokenFactory.balanceOf(processedToken, retailer), 40);
        assertEq(tokenFactory.balanceOf(processedToken, consumer), 10);
    }
    
    function testMultipleTransfersToSameRecipient() public {
        vm.prank(producer);
        uint256 tokenId = tokenFactory.createRawToken("Coffee", "", 1000);
        
        vm.prank(producer);
        uint256 transfer1 = transferManager.requestTransfer(tokenId, factory, 200);
        
        vm.prank(factory);
        transferManager.approveTransfer(transfer1);
        
        vm.prank(producer);
        uint256 transfer2 = transferManager.requestTransfer(tokenId, factory, 300);
        
        vm.prank(factory);
        transferManager.approveTransfer(transfer2);
        
        assertEq(tokenFactory.balanceOf(tokenId, producer), 500);
        assertEq(tokenFactory.balanceOf(tokenId, factory), 500);
    }
    
    // ============ Contract Reference Tests ============
    
    function testRoleManagerReferenceIsCorrect() public {
        assertEq(address(transferManager.roleManager()), address(roleManager));
    }
    
    function testTokenFactoryReferenceIsCorrect() public {
        assertEq(address(transferManager.tokenFactory()), address(tokenFactory));
    }
    
    function testAdminReferenceIsCorrect() public {
        assertEq(transferManager.admin(), admin);
    }
}

