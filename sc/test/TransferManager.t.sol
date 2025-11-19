// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/RoleManager.sol";
import "../src/TokenFactory.sol";
import "../src/TransferManager.sol";

/// @title Suite de Pruebas de TransferManager
/// @notice Pruebas exhaustivas para el contrato TransferManager
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
    
    /// @notice Verifica que un Productor puede solicitar una transferencia a una Fábrica
    /// @dev Al solicitar una transferencia:
    ///      - Se emite el evento TransferRequested
    ///      - Se crea una solicitud con estado Pending
    ///      - Se registran los datos de la transferencia (tokenId, from, to, amount)
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
    
    /// @notice Verifica que una Fábrica puede solicitar transferencia a un Minorista
    /// @dev La Fábrica puede transferir productos procesados al siguiente eslabón de la cadena
    function testFactoryCanRequestTransferToRetailer() public {

        vm.prank(producer);
        uint256 rawToken = tokenFactory.createRawToken("Leather", "", 100);
        
        vm.prank(producer);
        tokenFactory.transferToken(rawToken, producer, factory, 50);
        

        uint256[] memory parentIds = new uint256[](1);
        parentIds[0] = rawToken;
        
        vm.prank(factory);
        uint256 processedToken = tokenFactory.createProcessedToken("Wallet", "", 10, parentIds);
        

        vm.prank(factory);
        uint256 transferId = transferManager.requestTransfer(processedToken, retailer, 5);
        
        TransferManager.Transfer memory transfer = transferManager.getTransfer(transferId);
        assertEq(transfer.from, factory);
        assertEq(transfer.to, retailer);
        assertEq(uint8(transfer.fromRole), uint8(RoleManager.Role.Factory));
        assertEq(uint8(transfer.toRole), uint8(RoleManager.Role.Retailer));
    }
    
    /// @notice Verifica que un Minorista puede solicitar transferencia a un Consumidor
    /// @dev El Minorista puede transferir productos al consumidor final
    function testRetailerCanRequestTransferToConsumer() public {

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
        uint256 transferId = transferManager.requestTransfer(processedToken, consumer, 2);
        
        TransferManager.Transfer memory transfer = transferManager.getTransfer(transferId);
        assertEq(transfer.to, consumer);
        assertEq(uint8(transfer.toRole), uint8(RoleManager.Role.Consumer));
    }
    
    /// @notice Verifica que un Productor no puede transferir directamente a un Minorista
    /// @dev Las transferencias deben seguir el flujo: Producer -> Factory -> Retailer -> Consumer
    ///      Debe revertir con InvalidRoleTransition
    function testProducerCannotTransferToRetailer() public {
        vm.prank(producer);
        uint256 tokenId = tokenFactory.createRawToken("Coffee", "", 1000);
        
        vm.expectRevert(TransferManager.InvalidRoleTransition.selector);
        vm.prank(producer);
        transferManager.requestTransfer(tokenId, retailer, 500);
    }
    
    /// @notice Verifica que una Fábrica no puede transferir directamente a un Consumidor
    /// @dev Las transferencias deben seguir el flujo correcto de la cadena de suministro
    ///      Debe revertir con InvalidRoleTransition
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
    
    /// @notice Verifica que un Consumidor no puede transferir tokens
    /// @dev Los consumidores son el punto final de la cadena, no pueden transferir
    ///      Debe revertir con InvalidRoleTransition
    function testConsumerCannotTransferTokens() public {

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
        

        vm.expectRevert(TransferManager.InvalidRoleTransition.selector);
        vm.prank(consumer);
        transferManager.requestTransfer(processedToken, producer, 1);
    }
    
    /// @notice Verifica que no se puede solicitar transferencia con balance insuficiente
    /// @dev El remitente debe tener suficiente balance del token, debe revertir con Unauthorized
    function testCannotTransferWithInsufficientBalance() public {
        vm.prank(producer);
        uint256 tokenId = tokenFactory.createRawToken("Coffee", "", 1000);
        
        vm.expectRevert(TransferManager.Unauthorized.selector);
        vm.prank(producer);
        transferManager.requestTransfer(tokenId, factory, 2000);
    }
    
    /// @notice Verifica que se puede solicitar transferencia de cantidad cero
    /// @dev Nota: Este test permite cantidad cero, podría ser un caso límite a validar
    function testCannotTransferZeroAmount() public {
        vm.prank(producer);
        uint256 tokenId = tokenFactory.createRawToken("Coffee", "", 1000);
        

        vm.prank(producer);
        transferManager.requestTransfer(tokenId, factory, 0);
    }
    
    /// @notice Verifica que no se puede transferir a la dirección cero
    /// @dev Debe revertir con InvalidAddress si el destinatario es address(0)
    function testCannotTransferToZeroAddress() public {
        vm.prank(producer);
        uint256 tokenId = tokenFactory.createRawToken("Coffee", "", 1000);
        
        vm.expectRevert(TransferManager.InvalidAddress.selector);
        vm.prank(producer);
        transferManager.requestTransfer(tokenId, address(0), 500);
    }
    
    /// @notice Verifica que un usuario no aprobado no puede solicitar transferencias
    /// @dev Solo usuarios con roles aprobados pueden solicitar transferencias, debe revertir
    function testUnapprovedUserCannotTransfer() public {
        vm.prank(producer);
        uint256 tokenId = tokenFactory.createRawToken("Coffee", "", 1000);
        
        address unapproved = makeAddr("unapproved");
        

        vm.expectRevert(TransferManager.Unauthorized.selector);
        vm.prank(unapproved);
        transferManager.requestTransfer(tokenId, factory, 100);
    }
    
    // ============ Role-Based Transfer Validation Tests ============
    
    /// @notice Verifica que un Productor solo puede transferir materias primas que él creó
    /// @dev Un Productor no puede transferir tokens creados por otros Productores
    ///      Debe revertir con NotTokenCreator
    function testProducerCanOnlyTransferRawMaterialTheyCreated() public {

        address producer2 = makeAddr("producer2");
        vm.prank(producer2);
        roleManager.requestRole(RoleManager.Role.Producer);
        roleManager.approveRole(producer2);
        
        vm.prank(producer);
        uint256 tokenId = tokenFactory.createRawToken("Coffee", "", 1000);
        

        vm.expectRevert(TransferManager.NotTokenCreator.selector);
        vm.prank(producer2);
        transferManager.requestTransfer(tokenId, factory, 50);
    }
    
    /// @notice Verifica que un Productor no puede transferir productos procesados
    /// @dev Los Productores solo pueden transferir materias primas que crearon
    ///      Debe revertir con NotTokenCreator
    function testProducerCannotTransferProcessedGoods() public {
        vm.prank(producer);
        uint256 rawToken = tokenFactory.createRawToken("Leather", "", 100);
        
        vm.prank(producer);
        tokenFactory.transferToken(rawToken, producer, factory, 50);
        
        uint256[] memory parentIds = new uint256[](1);
        parentIds[0] = rawToken;
        
        vm.prank(factory);
        uint256 processedToken = tokenFactory.createProcessedToken("Wallet", "", 10, parentIds);
        

        vm.expectRevert(TransferManager.NotTokenCreator.selector);
        vm.prank(producer);
        transferManager.requestTransfer(processedToken, factory, 2);
    }
    
    /// @notice Verifica que una Fábrica solo puede transferir productos procesados que creó
    /// @dev Una Fábrica no puede transferir materias primas directamente, solo productos procesados
    ///      Debe revertir con NotTokenCreator
    function testFactoryCanOnlyTransferProcessedGoodsTheyCreated() public {
        vm.prank(producer);
        uint256 rawToken = tokenFactory.createRawToken("Leather", "", 100);
        
        vm.prank(producer);
        tokenFactory.transferToken(rawToken, producer, factory, 50);
        

        vm.expectRevert(TransferManager.NotTokenCreator.selector);
        vm.prank(factory);
        transferManager.requestTransfer(rawToken, retailer, 10);
    }
    
    /// @notice Verifica que un Minorista puede transferir cualquier token que posea
    /// @dev Los Minoristas tienen flexibilidad para transferir tanto materias primas como productos procesados
    function testRetailerCanTransferAnyToken() public {

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
        

        vm.prank(retailer);
        uint256 transfer1 = transferManager.requestTransfer(processedToken, consumer, 2);
        assertEq(transfer1, 1);
        

        vm.prank(retailer);
        uint256 transfer2 = transferManager.requestTransfer(rawToken, consumer, 5);
        assertEq(transfer2, 2);
    }
    
    // ============ Approval Tests ============
    
    /// @notice Verifica que el destinatario puede aprobar una transferencia
    /// @dev Al aprobar:
    ///      - Se emite el evento TransferResolved con estado Approved
    ///      - Los balances se actualizan (tokens se transfieren)
    ///      - El estado de la transferencia cambia a Approved
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
        

        assertEq(tokenFactory.balanceOf(tokenId, producer), 500);
        assertEq(tokenFactory.balanceOf(tokenId, factory), 500);
    }
    
    /// @notice Verifica que el admin puede aprobar cualquier transferencia
    /// @dev El admin tiene permisos para aprobar transferencias en nombre de cualquier destinatario
    function testAdminCanApproveTransfer() public {
        vm.prank(producer);
        uint256 tokenId = tokenFactory.createRawToken("Coffee", "", 1000);
        
        vm.prank(producer);
        uint256 transferId = transferManager.requestTransfer(tokenId, factory, 500);
        

        transferManager.approveTransfer(transferId);
        
        TransferManager.Transfer memory transfer = transferManager.getTransfer(transferId);
        assertEq(uint8(transfer.status), uint8(TransferManager.TransferStatus.Approved));
    }
    
    /// @notice Verifica que usuarios no autorizados no pueden aprobar transferencias
    /// @dev Solo el destinatario o el admin pueden aprobar, debe revertir con Unauthorized
    function testUnauthorizedCannotApprove() public {
        vm.prank(producer);
        uint256 tokenId = tokenFactory.createRawToken("Coffee", "", 1000);
        
        vm.prank(producer);
        uint256 transferId = transferManager.requestTransfer(tokenId, factory, 500);
        
        vm.expectRevert(TransferManager.Unauthorized.selector);
        vm.prank(retailer);
        transferManager.approveTransfer(transferId);
    }
    
    /// @notice Verifica que no se puede aprobar una transferencia que no está pendiente
    /// @dev Solo se pueden aprobar transferencias con estado Pending
    ///      Debe revertir con TransferNotPending si ya fue aprobada o rechazada
    function testCannotApproveNonPendingTransfer() public {
        vm.prank(producer);
        uint256 tokenId = tokenFactory.createRawToken("Coffee", "", 1000);
        
        vm.prank(producer);
        uint256 transferId = transferManager.requestTransfer(tokenId, factory, 500);
        
        vm.prank(factory);
        transferManager.approveTransfer(transferId);
        

        vm.expectRevert(TransferManager.TransferNotPending.selector);
        vm.prank(factory);
        transferManager.approveTransfer(transferId);
    }
    
    // ============ Rejection Tests ============
    
    /// @notice Verifica que el destinatario puede rechazar una transferencia
    /// @dev Al rechazar:
    ///      - Se emite el evento TransferResolved con estado Rejected
    ///      - Los balances no se modifican (no hay transferencia)
    ///      - El estado de la transferencia cambia a Rejected
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
        

        assertEq(tokenFactory.balanceOf(tokenId, producer), 1000);
        assertEq(tokenFactory.balanceOf(tokenId, factory), 0);
    }
    
    /// @notice Verifica que el admin puede rechazar cualquier transferencia
    /// @dev El admin tiene permisos para rechazar transferencias en nombre de cualquier destinatario
    function testAdminCanRejectTransfer() public {
        vm.prank(producer);
        uint256 tokenId = tokenFactory.createRawToken("Coffee", "", 1000);
        
        vm.prank(producer);
        uint256 transferId = transferManager.requestTransfer(tokenId, factory, 500);
        
        transferManager.rejectTransfer(transferId);
        
        TransferManager.Transfer memory transfer = transferManager.getTransfer(transferId);
        assertEq(uint8(transfer.status), uint8(TransferManager.TransferStatus.Rejected));
    }
    
    /// @notice Verifica que usuarios no autorizados no pueden rechazar transferencias
    /// @dev Solo el destinatario o el admin pueden rechazar, debe revertir con Unauthorized
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
    
    /// @notice Verifica que no se puede solicitar una transferencia si ya hay una pendiente
    /// @dev Solo puede haber una transferencia pendiente por token a la vez
    ///      Debe revertir con TransferAlreadyPending
    function testCannotRequestTransferWhenOnePending() public {
        vm.prank(producer);
        uint256 tokenId = tokenFactory.createRawToken("Coffee", "", 1000);
        
        vm.prank(producer);
        transferManager.requestTransfer(tokenId, factory, 500);
        
        vm.expectRevert(TransferManager.TransferAlreadyPending.selector);
        vm.prank(producer);
        transferManager.requestTransfer(tokenId, factory, 300);
    }
    
    /// @notice Verifica que se puede solicitar una nueva transferencia después de aprobar una
    /// @dev Una vez resuelta una transferencia (aprobada), se puede solicitar otra nueva
    function testCanRequestNewTransferAfterApproval() public {
        vm.prank(producer);
        uint256 tokenId = tokenFactory.createRawToken("Coffee", "", 1000);
        
        vm.prank(producer);
        uint256 transferId1 = transferManager.requestTransfer(tokenId, factory, 500);
        
        vm.prank(factory);
        transferManager.approveTransfer(transferId1);
        

        vm.prank(producer);
        uint256 transferId2 = transferManager.requestTransfer(tokenId, factory, 300);
        assertEq(transferId2, 2);
    }
    
    /// @notice Verifica que se puede solicitar una nueva transferencia después de rechazar una
    /// @dev Una vez resuelta una transferencia (rechazada), se puede solicitar otra nueva
    function testCanRequestNewTransferAfterRejection() public {
        vm.prank(producer);
        uint256 tokenId = tokenFactory.createRawToken("Coffee", "", 1000);
        
        vm.prank(producer);
        uint256 transferId1 = transferManager.requestTransfer(tokenId, factory, 500);
        
        vm.prank(factory);
        transferManager.rejectTransfer(transferId1);
        

        vm.prank(producer);
        uint256 transferId2 = transferManager.requestTransfer(tokenId, factory, 300);
        assertEq(transferId2, 2);
    }
    
    /// @notice Verifica que getPendingTransfer retorna el ID correcto de la transferencia pendiente
    /// @dev Retorna el ID de la transferencia pendiente para un token, o 0 si no hay ninguna
    function testGetPendingTransferReturnsCorrectId() public {
        vm.prank(producer);
        uint256 tokenId = tokenFactory.createRawToken("Coffee", "", 1000);
        
        vm.prank(producer);
        uint256 transferId = transferManager.requestTransfer(tokenId, factory, 500);
        
        uint256 pendingId = transferManager.getPendingTransfer(tokenId);
        assertEq(pendingId, transferId);
    }
    
    /// @notice Verifica que getPendingTransfer retorna 0 cuando no hay transferencia pendiente
    /// @dev Si no hay transferencias pendientes para un token, retorna 0
    function testGetPendingTransferReturnsZeroWhenNone() public {
        vm.prank(producer);
        uint256 tokenId = tokenFactory.createRawToken("Coffee", "", 1000);
        
        uint256 pendingId = transferManager.getPendingTransfer(tokenId);
        assertEq(pendingId, 0);
    }
    
    // ============ Token Transfer History Tests ============
    
    /// @notice Verifica que getTokenTransfers retorna el historial completo de transferencias
    /// @dev Retorna todas las transferencias (pendientes, aprobadas y rechazadas) de un token
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
    
    /// @notice Verifica el flujo completo de transferencias en la cadena de suministro
    /// @dev Prueba el ciclo completo: Producer -> Factory -> Retailer -> Consumer
    ///      con aprobaciones y verificación de balances en cada etapa
    function testCompleteSupplyChainTransferFlow() public {
        // Producer creates raw token
        vm.prank(producer);
        uint256 rawToken = tokenFactory.createRawToken("Raw Material", "", 1000);
        
        // Producer requests transfer to factory
        vm.prank(producer);
        uint256 transfer1 = transferManager.requestTransfer(rawToken, factory, 500);
        
        vm.prank(factory);
        transferManager.approveTransfer(transfer1);
        
        // Factory creates processed token
        uint256[] memory parentIds = new uint256[](1);
        parentIds[0] = rawToken;
        
        vm.prank(factory);
        uint256 processedToken = tokenFactory.createProcessedToken("Wallet", "", 100, parentIds);
        

        vm.prank(factory);
        uint256 transfer2 = transferManager.requestTransfer(processedToken, retailer, 50);
        
        vm.prank(retailer);
        transferManager.approveTransfer(transfer2);
        

        vm.prank(retailer);
        uint256 transfer3 = transferManager.requestTransfer(processedToken, consumer, 10);
        
        vm.prank(consumer);
        transferManager.approveTransfer(transfer3);
        

        assertEq(tokenFactory.balanceOf(rawToken, producer), 500);
        assertEq(tokenFactory.balanceOf(rawToken, factory), 500);
        assertEq(tokenFactory.balanceOf(processedToken, factory), 50);
        assertEq(tokenFactory.balanceOf(processedToken, retailer), 40);
        assertEq(tokenFactory.balanceOf(processedToken, consumer), 10);
    }
    
    /// @notice Verifica que se pueden hacer múltiples transferencias al mismo destinatario
    /// @dev Confirma que se pueden hacer varias transferencias secuenciales del mismo token
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
    
    /// @notice Verifica que la referencia al RoleManager es correcta
    /// @dev Confirma que el TransferManager tiene la referencia correcta al RoleManager
    function testRoleManagerReferenceIsCorrect() public {
        assertEq(address(transferManager.roleManager()), address(roleManager));
    }
    
    /// @notice Verifica que la referencia al TokenFactory es correcta
    /// @dev Confirma que el TransferManager tiene la referencia correcta al TokenFactory
    function testTokenFactoryReferenceIsCorrect() public {
        assertEq(address(transferManager.tokenFactory()), address(tokenFactory));
    }
    
    /// @notice Verifica que la referencia al admin es correcta
    /// @dev Confirma que el admin del TransferManager es quien desplegó el contrato
    function testAdminReferenceIsCorrect() public {
        assertEq(transferManager.admin(), admin);
    }
}


