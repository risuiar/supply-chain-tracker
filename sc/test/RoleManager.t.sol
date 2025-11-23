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
    
    /// @notice Verifica que el admin del contrato es quien lo desplegó
    /// @dev Al desplegar el contrato, el deployer se convierte automáticamente en admin
    function testAdminIsDeployer() public {
        assertEq(roleManager.admin(), admin);
    }
    
    /// @notice Verifica que una dirección que no es admin no puede ser admin
    /// @dev Confirma que solo el deployer tiene el rol de administrador
    function testIsAdminReturnsFalseForNonAdmin() public {
        assertFalse(roleManager.admin() == producer);
    }
    
    // ============ Role Request Tests ============
    
    /// @notice Verifica que un usuario puede solicitar un rol (Productor)
    /// @dev Comprueba que al solicitar un rol:
    ///      - Se emite el evento RoleRequested
    ///      - El rol actual sigue siendo None
    ///      - El usuario no está aprobado aún
    ///      - El rol solicitado se guarda correctamente
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
    
    /// @notice Verifica que no se puede solicitar el rol None
    /// @dev El rol None no es un rol válido para solicitar, debe revertir
    function testCannotRequestNoneRole() public {
        vm.expectRevert(RoleManager.InvalidRoleRequest.selector);
        vm.prank(producer);
        roleManager.requestRole(RoleManager.Role.None);
    }
    
    // ============ Approval Tests ============
    
    /// @notice Verifica que el admin puede aprobar una solicitud de rol
    /// @dev Al aprobar una solicitud:
    ///      - Se emite el evento RoleApproved
    ///      - El rol del usuario se actualiza al rol solicitado
    ///      - El usuario queda marcado como aprobado
    ///      - El rol solicitado se limpia (vuelve a None)
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
    
    /// @notice Verifica que solo el admin puede aprobar solicitudes de rol
    /// @dev Un usuario sin permisos de admin no puede aprobar solicitudes
    function testOnlyAdminCanApprove() public {
        vm.prank(producer);
        roleManager.requestRole(RoleManager.Role.Producer);
        
        vm.expectRevert(RoleManager.NotAdmin.selector);
        vm.prank(factory);
        roleManager.approveRole(producer);
    }
    
    /// @notice Verifica que no se puede aprobar un rol sin solicitud previa
    /// @dev Debe revertir si se intenta aprobar a un usuario que no ha solicitado ningún rol
    function testCannotApproveWithoutRequest() public {
        vm.expectRevert(RoleManager.RoleNotRequested.selector);
        roleManager.approveRole(producer);
    }
    
    // ============ Rejection Tests ============
    
    /// @notice Verifica que el admin puede rechazar una solicitud de rol
    /// @dev Al rechazar una solicitud:
    ///      - Se emite el evento RoleRejected
    ///      - El rol del usuario permanece como None
    ///      - El usuario no queda aprobado
    ///      - La solicitud se limpia (requestedRole vuelve a None)
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
    
    /// @notice Verifica que solo el admin puede rechazar solicitudes de rol
    /// @dev Un usuario sin permisos de admin no puede rechazar solicitudes
    function testOnlyAdminCanReject() public {
        vm.prank(producer);
        roleManager.requestRole(RoleManager.Role.Producer);
        
        vm.expectRevert(RoleManager.NotAdmin.selector);
        vm.prank(factory);
        roleManager.rejectRole(producer);
    }
    
    /// @notice Verifica que no se puede rechazar un rol sin solicitud previa
    /// @dev Debe revertir si se intenta rechazar a un usuario que no ha solicitado ningún rol
    function testCannotRejectWithoutRequest() public {
        vm.expectRevert(RoleManager.RoleNotRequested.selector);
        roleManager.rejectRole(producer);
    }
    
    // ============ Revocation Tests ============
    
    /// @notice Verifica que el admin puede revocar un rol aprobado
    /// @dev Al revocar un rol:
    ///      - Se emite el evento RoleRevoked
    ///      - El rol del usuario vuelve a None
    ///      - El usuario deja de estar aprobado
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
    
    /// @notice Verifica que solo el admin puede revocar roles
    /// @dev Un usuario sin permisos de admin no puede revocar roles de otros usuarios
    function testOnlyAdminCanRevoke() public {
        vm.prank(producer);
        roleManager.requestRole(RoleManager.Role.Producer);
        roleManager.approveRole(producer);
        
        vm.expectRevert(RoleManager.NotAdmin.selector);
        vm.prank(factory);
        roleManager.revokeRole(producer);
    }
    
    /// @notice Verifica que no se puede revocar un rol a un usuario no aprobado
    /// @dev Debe revertir si se intenta revocar un rol a un usuario que no tiene un rol aprobado
    function testCannotRevokeUnapprovedUser() public {
        vm.expectRevert(RoleManager.NotApproved.selector);
        roleManager.revokeRole(producer);
    }
    
    /// @notice Verifica que hasRole retorna false después de revocar un rol
    /// @dev Confirma que después de revocar un rol, el usuario ya no tiene ese rol
    function testHasRoleReturnsFalseAfterRevocation() public {
        vm.prank(producer);
        roleManager.requestRole(RoleManager.Role.Producer);
        roleManager.approveRole(producer);
        roleManager.revokeRole(producer);
        
        assertFalse(roleManager.hasRole(producer, RoleManager.Role.Producer));
    }
    
    // ============ Multiple Users Tests ============
    
    /// @notice Verifica que múltiples usuarios pueden solicitar y obtener diferentes roles
    /// @dev Confirma que el sistema puede manejar múltiples usuarios simultáneamente
    ///      con diferentes roles asignados correctamente
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
    
    /// @notice Verifica que se pueden aprobar múltiples usuarios en secuencia
    /// @dev Prueba el flujo de aprobación en batch para varios usuarios con diferentes roles
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
    
    /// @notice Verifica que un usuario con rol aprobado no puede solicitar otro rol
    /// @dev Previene que usuarios con roles activos soliciten múltiples roles simultáneamente
    ///      Debe revertir con AlreadyHasRole si el usuario ya tiene un rol aprobado
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
    
    /// @notice Verifica que un usuario no puede solicitar un nuevo rol si ya tiene una solicitud pendiente
    /// @dev Previene spam de solicitudes y asegura que solo haya una solicitud activa por usuario
    ///      Debe revertir con RoleAlreadyRequested si hay una solicitud pendiente
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
    
    /// @notice Verifica que un usuario puede cancelar su propia solicitud de rol
    /// @dev Al cancelar una solicitud:
    ///      - Se emite el evento RoleRejected
    ///      - La solicitud se limpia (requestedRole vuelve a None)
    ///      - El usuario no queda aprobado
    ///      - El rol permanece como None
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
    
    /// @notice Verifica que no se puede cancelar una solicitud si no hay una pendiente
    /// @dev Debe revertir si un usuario intenta cancelar sin tener una solicitud activa
    function testCannotCancelWithoutPendingRequest() public {
        // Intenta cancelar sin tener una solicitud pendiente
        vm.expectRevert(RoleManager.RoleNotRequested.selector);
        vm.prank(producer);
        roleManager.cancelRequest();
    }
    
    /// @notice Verifica que un usuario puede solicitar un nuevo rol después de cancelar
    /// @dev Confirma que después de cancelar una solicitud, el usuario puede hacer una nueva
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
}

