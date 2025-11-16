// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/RoleManager.sol";
import "../src/TokenFactory.sol";

/// @title Suite de Pruebas de TokenFactory
/// @notice Pruebas exhaustivas para el contrato TokenFactory
contract TokenFactoryTest is Test {
    RoleManager public roleManager;
    TokenFactory public tokenFactory;
    
    address public admin;
    address public producer;
    address public factory;
    address public retailer;
    address public consumer;
    
    event TokenCreated(
        uint256 indexed tokenId,
        string productName,
        TokenFactory.AssetType assetType,
        address indexed creator,
        string metadataURI
    );
    
    event TokenTransferred(
        uint256 indexed tokenId,
        address indexed from,
        address indexed to
    );
    
    function setUp() public {
        admin = address(this);
        producer = makeAddr("producer");
        factory = makeAddr("factory");
        retailer = makeAddr("retailer");
        consumer = makeAddr("consumer");
        
        roleManager = new RoleManager();
        tokenFactory = new TokenFactory(address(roleManager));
        
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
    
    // ============ Raw Token Creation Tests ============
    
    function testProducerCanCreateRawToken() public {
        vm.expectEmit(true, false, false, true);
        emit TokenCreated(1, "Coffee Beans", TokenFactory.AssetType.RawMaterial, producer, "");
        
        vm.prank(producer);
        uint256 tokenId = tokenFactory.createRawToken("Coffee Beans", "", 1000);
        
        assertEq(tokenId, 1);
        
        TokenFactory.Token memory token = tokenFactory.getToken(tokenId);
        assertEq(token.productName, "Coffee Beans");
        assertEq(uint8(token.assetType), uint8(TokenFactory.AssetType.RawMaterial));
        assertEq(token.totalSupply, 1000);
        assertEq(token.creator, producer);
        assertTrue(token.exists);
    }
    
    function testProducerCanCreateRawTokenWithMetadata() public {
        string memory metadata = '{"origin": "Colombia", "quality": "Premium"}';
        
        vm.prank(producer);
        uint256 tokenId = tokenFactory.createRawToken("Premium Coffee", metadata, 500);
        
        TokenFactory.Token memory token = tokenFactory.getToken(tokenId);
        assertEq(token.metadataURI, metadata);
    }
    
    function testCreatorReceivesInitialSupply() public {
        vm.prank(producer);
        uint256 tokenId = tokenFactory.createRawToken("Coffee Beans", "", 1000);
        
        uint256 balance = tokenFactory.balanceOf(tokenId, producer);
        assertEq(balance, 1000);
    }
    
    function testFactoryCannotCreateRawToken() public {
        vm.expectRevert(TokenFactory.NotApproved.selector);
        vm.prank(factory);
        tokenFactory.createRawToken("Coffee Beans", "", 1000);
    }
    
    function testRetailerCannotCreateRawToken() public {
        vm.expectRevert(TokenFactory.NotApproved.selector);
        vm.prank(retailer);
        tokenFactory.createRawToken("Coffee Beans", "", 1000);
    }
    
    function testConsumerCannotCreateRawToken() public {
        vm.expectRevert(TokenFactory.NotApproved.selector);
        vm.prank(consumer);
        tokenFactory.createRawToken("Coffee Beans", "", 1000);
    }
    
    function testUnapprovedUserCannotCreateToken() public {
        address unapproved = makeAddr("unapproved");
        
        vm.expectRevert(TokenFactory.NotApproved.selector);
        vm.prank(unapproved);
        tokenFactory.createRawToken("Coffee Beans", "", 1000);
    }
    
    // ============ Processed Token Creation Tests ============
    
    function testFactoryCanCreateProcessedToken() public {
        // Producer creates raw material
        vm.prank(producer);
        uint256 rawTokenId = tokenFactory.createRawToken("Leather", "", 100);
        
        // Transfer to factory
        vm.prank(producer);
        tokenFactory.transferToken(rawTokenId, producer, factory, 50);
        
        // Factory creates processed token
        uint256[] memory parentIds = new uint256[](1);
        parentIds[0] = rawTokenId;
        
        vm.expectEmit(true, false, false, true);
        emit TokenCreated(2, "Leather Wallet", TokenFactory.AssetType.ProcessedGood, factory, "");
        
        vm.prank(factory);
        uint256 processedTokenId = tokenFactory.createProcessedToken("Leather Wallet", "", 10, parentIds);
        
        assertEq(processedTokenId, 2);
        
        TokenFactory.Token memory token = tokenFactory.getToken(processedTokenId);
        assertEq(token.productName, "Leather Wallet");
        assertEq(uint8(token.assetType), uint8(TokenFactory.AssetType.ProcessedGood));
        assertEq(token.parentIds.length, 1);
        assertEq(token.parentIds[0], rawTokenId);
    }
    
    function testFactoryCanCreateTokenFromMultipleParents() public {
        // Create multiple raw materials
        vm.prank(producer);
        uint256 token1 = tokenFactory.createRawToken("Cotton", "", 100);
        
        vm.prank(producer);
        uint256 token2 = tokenFactory.createRawToken("Dye", "", 50);
        
        // Transfer to factory
        vm.prank(producer);
        tokenFactory.transferToken(token1, producer, factory, 30);
        
        vm.prank(producer);
        tokenFactory.transferToken(token2, producer, factory, 20);
        
        // Factory creates processed token from both
        uint256[] memory parentIds = new uint256[](2);
        parentIds[0] = token1;
        parentIds[1] = token2;
        
        vm.prank(factory);
        uint256 processedTokenId = tokenFactory.createProcessedToken("Colored Fabric", "", 25, parentIds);
        
        TokenFactory.Token memory token = tokenFactory.getToken(processedTokenId);
        assertEq(token.parentIds.length, 2);
        assertEq(token.parentIds[0], token1);
        assertEq(token.parentIds[1], token2);
    }
    
    function testFactoryCannotCreateTokenWithoutParents() public {
        uint256[] memory emptyParents = new uint256[](0);
        
        vm.expectRevert(TokenFactory.MissingParentAssets.selector);
        vm.prank(factory);
        tokenFactory.createProcessedToken("Wallet", "", 10, emptyParents);
    }
    
    function testFactoryCannotCreateTokenFromNonExistentParent() public {
        uint256[] memory parentIds = new uint256[](1);
        parentIds[0] = 999; // Non-existent token
        
        vm.expectRevert(TokenFactory.AssetDoesNotExist.selector);
        vm.prank(factory);
        tokenFactory.createProcessedToken("Wallet", "", 10, parentIds);
    }
    
    function testFactoryCannotCreateTokenWithoutParentBalance() public {
        vm.prank(producer);
        uint256 rawTokenId = tokenFactory.createRawToken("Leather", "", 100);
        
        // Factory tries to create without having balance
        uint256[] memory parentIds = new uint256[](1);
        parentIds[0] = rawTokenId;
        
        vm.expectRevert(TokenFactory.InvalidRoleTransition.selector);
        vm.prank(factory);
        tokenFactory.createProcessedToken("Wallet", "", 10, parentIds);
    }
    
    function testProducerCannotCreateProcessedToken() public {
        vm.prank(producer);
        uint256 rawTokenId = tokenFactory.createRawToken("Leather", "", 100);
        
        uint256[] memory parentIds = new uint256[](1);
        parentIds[0] = rawTokenId;
        
        vm.expectRevert(TokenFactory.NotApproved.selector);
        vm.prank(producer);
        tokenFactory.createProcessedToken("Wallet", "", 10, parentIds);
    }
    
    // ============ Token Query Tests ============
    
    function testGetTokenReturnsCorrectData() public {
        vm.prank(producer);
        uint256 tokenId = tokenFactory.createRawToken("Coffee", "metadata", 100);
        
        TokenFactory.Token memory token = tokenFactory.getToken(tokenId);
        assertEq(token.id, tokenId);
        assertEq(token.productName, "Coffee");
        assertEq(token.metadataURI, "metadata");
        assertEq(token.totalSupply, 100);
        assertEq(token.creator, producer);
        assertEq(token.currentHolder, producer);
        assertTrue(token.exists);
    }
    
    function testGetNonExistentTokenReverts() public {
        vm.expectRevert(TokenFactory.AssetDoesNotExist.selector);
        tokenFactory.getToken(999);
    }
    
    function testGetUserTokensReturnsCorrectTokens() public {
        vm.startPrank(producer);
        tokenFactory.createRawToken("Token1", "", 100);
        tokenFactory.createRawToken("Token2", "", 200);
        tokenFactory.createRawToken("Token3", "", 300);
        vm.stopPrank();
        
        uint256[] memory userTokens = tokenFactory.getUserTokens(producer);
        assertEq(userTokens.length, 3);
        assertEq(userTokens[0], 1);
        assertEq(userTokens[1], 2);
        assertEq(userTokens[2], 3);
    }
    
    function testBalanceOfReturnsCorrectBalance() public {
        vm.prank(producer);
        uint256 tokenId = tokenFactory.createRawToken("Coffee", "", 1000);
        
        uint256 balance = tokenFactory.balanceOf(tokenId, producer);
        assertEq(balance, 1000);
        
        // Other users should have 0 balance
        assertEq(tokenFactory.balanceOf(tokenId, factory), 0);
    }
    
    function testBalanceOfNonExistentTokenReverts() public {
        vm.expectRevert(TokenFactory.AssetDoesNotExist.selector);
        tokenFactory.balanceOf(999, producer);
    }
    
    function testGetTokenHolderReturnsCorrectHolder() public {
        vm.prank(producer);
        uint256 tokenId = tokenFactory.createRawToken("Coffee", "", 100);
        
        address holder = tokenFactory.getTokenHolder(tokenId);
        assertEq(holder, producer);
    }
    
    // ============ Transfer Tests ============
    
    function testTransferTokenUpdatesBalances() public {
        vm.prank(producer);
        uint256 tokenId = tokenFactory.createRawToken("Coffee", "", 1000);
        
        vm.expectEmit(true, true, true, false);
        emit TokenTransferred(tokenId, producer, factory);
        
        vm.prank(producer);
        tokenFactory.transferToken(tokenId, producer, factory, 400);
        
        assertEq(tokenFactory.balanceOf(tokenId, producer), 600);
        assertEq(tokenFactory.balanceOf(tokenId, factory), 400);
    }
    
    function testTransferFullBalanceUpdatesHolder() public {
        vm.prank(producer);
        uint256 tokenId = tokenFactory.createRawToken("Coffee", "", 1000);
        
        vm.prank(producer);
        tokenFactory.transferToken(tokenId, producer, factory, 1000);
        
        address holder = tokenFactory.getTokenHolder(tokenId);
        assertEq(holder, factory);
    }
    
    function testTransferRemovesTokenFromSenderList() public {
        vm.prank(producer);
        uint256 tokenId = tokenFactory.createRawToken("Coffee", "", 100);
        
        vm.prank(producer);
        tokenFactory.transferToken(tokenId, producer, factory, 100);
        
        uint256[] memory producerTokens = tokenFactory.getUserTokens(producer);
        assertEq(producerTokens.length, 0);
        
        uint256[] memory factoryTokens = tokenFactory.getUserTokens(factory);
        assertEq(factoryTokens.length, 1);
        assertEq(factoryTokens[0], tokenId);
    }
    
    function testTransferInsufficientBalanceReverts() public {
        vm.prank(producer);
        uint256 tokenId = tokenFactory.createRawToken("Coffee", "", 100);
        
        vm.expectRevert(TokenFactory.Unauthorized.selector);
        vm.prank(producer);
        tokenFactory.transferToken(tokenId, producer, factory, 200);
    }
    
    function testTransferNonExistentTokenReverts() public {
        vm.expectRevert(TokenFactory.AssetDoesNotExist.selector);
        vm.prank(producer);
        tokenFactory.transferToken(999, producer, factory, 10);
    }
    
    function testPartialTransferKeepsTokenInBothLists() public {
        vm.prank(producer);
        uint256 tokenId = tokenFactory.createRawToken("Coffee", "", 1000);
        
        vm.prank(producer);
        tokenFactory.transferToken(tokenId, producer, factory, 400);
        
        uint256[] memory producerTokens = tokenFactory.getUserTokens(producer);
        uint256[] memory factoryTokens = tokenFactory.getUserTokens(factory);
        
        assertEq(producerTokens.length, 1);
        assertEq(factoryTokens.length, 1);
    }
    
    // ============ Role Manager Integration Tests ============
    
    function testRoleManagerAddressIsCorrect() public {
        assertEq(address(tokenFactory.roleManager()), address(roleManager));
    }
    
    function testTokenCreatorRoleIsRecorded() public {
        vm.prank(producer);
        uint256 tokenId = tokenFactory.createRawToken("Coffee", "", 100);
        
        TokenFactory.Token memory token = tokenFactory.getToken(tokenId);
        assertEq(uint8(token.currentRole), uint8(RoleManager.Role.Producer));
    }
    
    function testCurrentRoleUpdatesOnTransfer() public {
        vm.prank(producer);
        uint256 tokenId = tokenFactory.createRawToken("Coffee", "", 100);
        
        vm.prank(producer);
        tokenFactory.transferToken(tokenId, producer, factory, 100);
        
        TokenFactory.Token memory token = tokenFactory.getToken(tokenId);
        assertEq(uint8(token.currentRole), uint8(RoleManager.Role.Factory));
    }
    
    // ============ Edge Cases and Complex Scenarios ============
    
    function testMultipleTokensWithDifferentSupplies() public {
        vm.startPrank(producer);
        uint256 token1 = tokenFactory.createRawToken("Token1", "", 100);
        uint256 token2 = tokenFactory.createRawToken("Token2", "", 200);
        uint256 token3 = tokenFactory.createRawToken("Token3", "", 300);
        vm.stopPrank();
        
        assertEq(tokenFactory.balanceOf(token1, producer), 100);
        assertEq(tokenFactory.balanceOf(token2, producer), 200);
        assertEq(tokenFactory.balanceOf(token3, producer), 300);
    }
    
    function testCompleteSupplyChainFlow() public {
        // Producer creates raw material
        vm.prank(producer);
        uint256 rawToken = tokenFactory.createRawToken("Raw Material", "", 1000);
        
        // Producer transfers to Factory
        vm.prank(producer);
        tokenFactory.transferToken(rawToken, producer, factory, 500);
        
        // Factory creates processed token
        uint256[] memory parentIds = new uint256[](1);
        parentIds[0] = rawToken;
        
        vm.prank(factory);
        uint256 processedToken = tokenFactory.createProcessedToken("Processed Good", "", 100, parentIds);
        
        // Verify balances
        assertEq(tokenFactory.balanceOf(rawToken, producer), 500);
        assertEq(tokenFactory.balanceOf(rawToken, factory), 500);
        assertEq(tokenFactory.balanceOf(processedToken, factory), 100);
        
        // Verify token data
        TokenFactory.Token memory processed = tokenFactory.getToken(processedToken);
        assertEq(uint8(processed.assetType), uint8(TokenFactory.AssetType.ProcessedGood));
        assertEq(processed.parentIds[0], rawToken);
    }
    
    function testMultipleTransfersUpdateBalancesCorrectly() public {
        vm.prank(producer);
        uint256 tokenId = tokenFactory.createRawToken("Coffee", "", 1000);
        
        vm.prank(producer);
        tokenFactory.transferToken(tokenId, producer, factory, 300);
        
        vm.prank(producer);
        tokenFactory.transferToken(tokenId, producer, retailer, 200);
        
        assertEq(tokenFactory.balanceOf(tokenId, producer), 500);
        assertEq(tokenFactory.balanceOf(tokenId, factory), 300);
        assertEq(tokenFactory.balanceOf(tokenId, retailer), 200);
    }
}

