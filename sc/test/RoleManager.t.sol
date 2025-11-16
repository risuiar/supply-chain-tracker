// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/RoleManager.sol";

/// @title Suite de Pruebas de RoleManager
/// @notice Pruebas exhaustivas para el contrato RoleManager
contract RoleManagerTest is Test {
    RoleManager public roleManager;
    
    address public admin;
    address public producer;
    address public factory;
    address public retailer;
    address public consumer;
    
    event RoleRequested(address indexed account, RoleManager.Role indexed requestedRole);
    event RoleApproved(address indexed account, RoleManager.Role indexed role);
    event RoleRejected(address indexed account, RoleManager.Role indexed requestedRole);
    event RoleRevoked(address indexed account, RoleManager.Role indexed previousRole);
    
    function setUp() public {
        admin = address(this);
        producer = makeAddr("producer");
        factory = makeAddr("factory");
        retailer = makeAddr("retailer");
        consumer = makeAddr("consumer");
        
        roleManager = new RoleManager();
    }
    
    // ============ Admin Tests ============
    
    function testAdminIsDeployer() public {
        assertEq(roleManager.admin(), admin);
    }
    
    function testIsAdminReturnsTrue() public {
        assertTrue(roleManager.admin() == admin);
    }
    
    function testIsAdminReturnsFalseForNonAdmin() public {
        assertFalse(roleManager.admin() == producer);
    }
    
    // ============ Role Request Tests ============
    
    function testRequestRoleAsProducer() public {
        vm.expectEmit(true, true, false, false);
        emit RoleRequested(producer, RoleManager.Role.Producer);
        
        vm.prank(producer);
        roleManager.requestRole(RoleManager.Role.Producer);
        
        RoleManager.User memory user = roleManager.getUser(producer);
        assertEq(uint8(user.role), uint8(RoleManager.Role.None));
        assertFalse(user.approved);
        assertEq(uint8(user.requestedRole), uint8(RoleManager.Role.Producer));
    }
    
    function testRequestRoleAsFactory() public {
        vm.prank(factory);
        roleManager.requestRole(RoleManager.Role.Factory);
        
        RoleManager.User memory user = roleManager.getUser(factory);
        assertEq(uint8(user.requestedRole), uint8(RoleManager.Role.Factory));
    }
    
    function testRequestRoleAsRetailer() public {
        vm.prank(retailer);
        roleManager.requestRole(RoleManager.Role.Retailer);
        
        RoleManager.User memory user = roleManager.getUser(retailer);
        assertEq(uint8(user.requestedRole), uint8(RoleManager.Role.Retailer));
    }
    
    function testRequestRoleAsConsumer() public {
        vm.prank(consumer);
        roleManager.requestRole(RoleManager.Role.Consumer);
        
        RoleManager.User memory user = roleManager.getUser(consumer);
        assertEq(uint8(user.requestedRole), uint8(RoleManager.Role.Consumer));
    }
    
    function testCannotRequestNoneRole() public {
        vm.expectRevert(RoleManager.InvalidRoleRequest.selector);
        vm.prank(producer);
        roleManager.requestRole(RoleManager.Role.None);
    }
    
    // ============ Approval Tests ============
    
    function testApproveRoleByAdmin() public {
        vm.prank(producer);
        roleManager.requestRole(RoleManager.Role.Producer);
        
        vm.expectEmit(true, true, false, false);
        emit RoleApproved(producer, RoleManager.Role.Producer);
        
        roleManager.approveRole(producer);
        
        RoleManager.User memory user = roleManager.getUser(producer);
        assertEq(uint8(user.role), uint8(RoleManager.Role.Producer));
        assertTrue(user.approved);
        assertEq(uint8(user.requestedRole), uint8(RoleManager.Role.None));
    }
    
    function testOnlyAdminCanApprove() public {
        vm.prank(producer);
        roleManager.requestRole(RoleManager.Role.Producer);
        
        vm.expectRevert(RoleManager.NotAdmin.selector);
        vm.prank(factory);
        roleManager.approveRole(producer);
    }
    
    function testCannotApproveWithoutRequest() public {
        vm.expectRevert(RoleManager.RoleNotRequested.selector);
        roleManager.approveRole(producer);
    }
    
    function testHasRoleReturnsTrueAfterApproval() public {
        vm.prank(producer);
        roleManager.requestRole(RoleManager.Role.Producer);
        roleManager.approveRole(producer);
        
        assertTrue(roleManager.hasRole(producer, RoleManager.Role.Producer));
    }
    
    function testIsApprovedReturnsTrueAfterApproval() public {
        vm.prank(producer);
        roleManager.requestRole(RoleManager.Role.Producer);
        roleManager.approveRole(producer);
        
        assertTrue(roleManager.isApproved(producer));
    }
    
    function testGetUserRoleReturnsCorrectRole() public {
        vm.prank(factory);
        roleManager.requestRole(RoleManager.Role.Factory);
        roleManager.approveRole(factory);
        
        assertEq(uint8(roleManager.getUserRole(factory)), uint8(RoleManager.Role.Factory));
    }
    
    // ============ Rejection Tests ============
    
    function testRejectRoleByAdmin() public {
        vm.prank(producer);
        roleManager.requestRole(RoleManager.Role.Producer);
        
        vm.expectEmit(true, true, false, false);
        emit RoleRejected(producer, RoleManager.Role.Producer);
        
        roleManager.rejectRole(producer);
        
        RoleManager.User memory user = roleManager.getUser(producer);
        assertEq(uint8(user.role), uint8(RoleManager.Role.None));
        assertFalse(user.approved);
        assertEq(uint8(user.requestedRole), uint8(RoleManager.Role.None));
    }
    
    function testOnlyAdminCanReject() public {
        vm.prank(producer);
        roleManager.requestRole(RoleManager.Role.Producer);
        
        vm.expectRevert(RoleManager.NotAdmin.selector);
        vm.prank(factory);
        roleManager.rejectRole(producer);
    }
    
    function testCannotRejectWithoutRequest() public {
        vm.expectRevert(RoleManager.RoleNotRequested.selector);
        roleManager.rejectRole(producer);
    }
    
    // ============ Revocation Tests ============
    
    function testRevokeRoleByAdmin() public {
        vm.prank(producer);
        roleManager.requestRole(RoleManager.Role.Producer);
        roleManager.approveRole(producer);
        
        vm.expectEmit(true, true, false, false);
        emit RoleRevoked(producer, RoleManager.Role.Producer);
        
        roleManager.revokeRole(producer);
        
        RoleManager.User memory user = roleManager.getUser(producer);
        assertEq(uint8(user.role), uint8(RoleManager.Role.None));
        assertFalse(user.approved);
    }
    
    function testOnlyAdminCanRevoke() public {
        vm.prank(producer);
        roleManager.requestRole(RoleManager.Role.Producer);
        roleManager.approveRole(producer);
        
        vm.expectRevert(RoleManager.NotAdmin.selector);
        vm.prank(factory);
        roleManager.revokeRole(producer);
    }
    
    function testCannotRevokeUnapprovedUser() public {
        vm.expectRevert(RoleManager.NotApproved.selector);
        roleManager.revokeRole(producer);
    }
    
    function testHasRoleReturnsFalseAfterRevocation() public {
        vm.prank(producer);
        roleManager.requestRole(RoleManager.Role.Producer);
        roleManager.approveRole(producer);
        roleManager.revokeRole(producer);
        
        assertFalse(roleManager.hasRole(producer, RoleManager.Role.Producer));
    }
    
    // ============ Multiple Users Tests ============
    
    function testMultipleUsersCanRequestDifferentRoles() public {
        vm.prank(producer);
        roleManager.requestRole(RoleManager.Role.Producer);
        
        vm.prank(factory);
        roleManager.requestRole(RoleManager.Role.Factory);
        
        vm.prank(retailer);
        roleManager.requestRole(RoleManager.Role.Retailer);
        
        roleManager.approveRole(producer);
        roleManager.approveRole(factory);
        roleManager.approveRole(retailer);
        
        assertTrue(roleManager.hasRole(producer, RoleManager.Role.Producer));
        assertTrue(roleManager.hasRole(factory, RoleManager.Role.Factory));
        assertTrue(roleManager.hasRole(retailer, RoleManager.Role.Retailer));
    }
    
    function testApproveMultipleUsers() public {
        address[] memory users = new address[](4);
        users[0] = producer;
        users[1] = factory;
        users[2] = retailer;
        users[3] = consumer;
        
        vm.prank(producer);
        roleManager.requestRole(RoleManager.Role.Producer);
        
        vm.prank(factory);
        roleManager.requestRole(RoleManager.Role.Factory);
        
        vm.prank(retailer);
        roleManager.requestRole(RoleManager.Role.Retailer);
        
        vm.prank(consumer);
        roleManager.requestRole(RoleManager.Role.Consumer);
        
        for (uint i = 0; i < users.length; i++) {
            roleManager.approveRole(users[i]);
            assertTrue(roleManager.isApproved(users[i]));
        }
    }
    
    // ============ Edge Cases & New Validations ============
    
    function testCannotRequestRoleIfAlreadyHasApprovedRole() public {
        // El usuario solicita y es aprobado como Productor
        vm.prank(producer);
        roleManager.requestRole(RoleManager.Role.Producer);
        roleManager.approveRole(producer);
        
        // Intenta solicitar otro rol - debe revertir con AlreadyHasRole
        vm.expectRevert(RoleManager.AlreadyHasRole.selector);
        vm.prank(producer);
        roleManager.requestRole(RoleManager.Role.Factory);
    }
    
    function testCannotRequestRoleIfAlreadyHasPendingRequest() public {
        // El usuario solicita rol de Productor
        vm.prank(producer);
        roleManager.requestRole(RoleManager.Role.Producer);
        
        // Intenta solicitar rol de Fábrica mientras la solicitud de Productor está pendiente
        vm.expectRevert(RoleManager.RoleAlreadyRequested.selector);
        vm.prank(producer);
        roleManager.requestRole(RoleManager.Role.Factory);
    }
    
    // ============ Cancel Request Tests ============
    
    function testUserCanCancelOwnRequest() public {
        // El usuario solicita un rol
        vm.prank(producer);
        roleManager.requestRole(RoleManager.Role.Producer);
        
        // El usuario cancela su solicitud
        vm.expectEmit(true, true, false, false);
        emit RoleRejected(producer, RoleManager.Role.Producer);
        
        vm.prank(producer);
        roleManager.cancelRequest();
        
        // Verifica que la solicitud fue cancelada
        RoleManager.User memory user = roleManager.getUser(producer);
        assertEq(uint8(user.requestedRole), uint8(RoleManager.Role.None));
        assertFalse(user.approved);
        assertEq(uint8(user.role), uint8(RoleManager.Role.None));
    }
    
    function testCannotCancelWithoutPendingRequest() public {
        // Intenta cancelar sin tener una solicitud pendiente
        vm.expectRevert(RoleManager.RoleNotRequested.selector);
        vm.prank(producer);
        roleManager.cancelRequest();
    }
    
    function testCanRequestAgainAfterCancellingRequest() public {
        // El usuario solicita Productor
        vm.prank(producer);
        roleManager.requestRole(RoleManager.Role.Producer);
        
        // El usuario cancela
        vm.prank(producer);
        roleManager.cancelRequest();
        
        // El usuario puede solicitar Fábrica ahora
        vm.prank(producer);
        roleManager.requestRole(RoleManager.Role.Factory);
        
        RoleManager.User memory user = roleManager.getUser(producer);
        assertEq(uint8(user.requestedRole), uint8(RoleManager.Role.Factory));
    }
    
    function testGetUserReturnsCorrectData() public {
        vm.prank(producer);
        roleManager.requestRole(RoleManager.Role.Producer);
        
        RoleManager.User memory user1 = roleManager.getUser(producer);
        assertEq(uint8(user1.role), uint8(RoleManager.Role.None));
        assertFalse(user1.approved);
        assertEq(uint8(user1.requestedRole), uint8(RoleManager.Role.Producer));
        
        roleManager.approveRole(producer);
        
        RoleManager.User memory user2 = roleManager.getUser(producer);
        assertEq(uint8(user2.role), uint8(RoleManager.Role.Producer));
        assertTrue(user2.approved);
        assertEq(uint8(user2.requestedRole), uint8(RoleManager.Role.None));
    }
}
