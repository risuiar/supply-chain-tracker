// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title RoleManager
<<<<<<< HEAD
/// @notice Manages user roles and access control for the supply chain
=======
/// @notice Gestiona los roles de usuario y el control de acceso para la cadena de suministro
>>>>>>> dev
/// @dev Se han añadido algunas validaciones extra y nuevas funciones sin romper la interfaz original.
contract RoleManager {
    enum Role {
        None,
        Producer,
        Factory,
        Retailer,
        Consumer
    }

    struct User {
        // Rol actualmente asignado al usuario
        Role role;
        // Indica si el rol actual fue aprobado por el admin
        bool approved;
        // Rol que el usuario ha solicitado y está pendiente de revisión
        Role requestedRole;
    }

    // =====================
    // Custom errors
    // =====================

    error NotAdmin();
    error RoleNotRequested();
    error InvalidRoleRequest();
    error NotApproved();

    // Nuevos errores para las mejoras
    error AlreadyHasRole();        // el usuario ya tiene un rol aprobado
    error RoleAlreadyRequested();  // el usuario ya tiene una solicitud pendiente

    // =====================
    // Events
    // =====================

    event RoleRequested(address indexed account, Role indexed requestedRole);
    event RoleApproved(address indexed account, Role indexed role);
    event RoleRejected(address indexed account, Role indexed requestedRole);
    event RoleRevoked(address indexed account, Role indexed previousRole);

    // =====================
    // State
    // =====================

    // Dirección del administrador del sistema (quien despliega el contrato)
    address public immutable admin;

    // Información de cada usuario, indexada por su address
    mapping(address => User) private _users;

    // =====================
    // Constructor
    // =====================

    constructor() {
        // Quien despliega el contrato se convierte en admin
        admin = msg.sender;
    }

    // =====================
    // Modifiers
    // =====================

    /// @dev Restringe la ejecución de una función solo al admin
    modifier onlyAdmin() {
        if (msg.sender != admin) {
            revert NotAdmin();
        }
        _;
    }

<<<<<<< HEAD
    /// @dev Ejemplo de modifier para usar en contratos que hereden:
    /// solo permite que un usuario con un rol aprobado específico ejecute la función.
    /// (No se usa dentro de este contrato, pero queda listo para extender la lógica.)
=======
    /// @dev Modifier para usar en contratos que hereden o extiendan este contrato.
    /// Solo permite que un usuario con un rol aprobado específico ejecute la función.
    /// Nota: No se usa actualmente en este contrato, pero está disponible para extensión futura.
>>>>>>> dev
    modifier onlyRole(Role requiredRole) {
        User storage user = _users[msg.sender];
        if (!user.approved || user.role != requiredRole) {
            // Reutilizamos NotApproved para indicar que no cumple con el rol requerido
            revert NotApproved();
        }
        _;
    }

    // =====================
    // Core logic
    // =====================

<<<<<<< HEAD
    /// @notice Request a role in the supply chain
    /// @param desiredRole The role being requested
=======
    /// @notice Solicita un rol en la cadena de suministro
    /// @param desiredRole El rol que se está solicitando
>>>>>>> dev
    /// @dev Mejoras:
    ///  - No permite pedir Role.None
    ///  - No permite pedir un rol si el usuario ya tiene uno aprobado
    ///  - No permite pedir un nuevo rol si ya tiene una solicitud pendiente
    function requestRole(Role desiredRole) external {
        if (desiredRole == Role.None) {
            revert InvalidRoleRequest();
        }

        User storage user = _users[msg.sender];

        // Mejora 1: no permitir que un usuario con rol aprobado pida otro rol
        if (user.approved && user.role != Role.None) {
            revert AlreadyHasRole();
        }

        // Mejora 2: no permitir spam de solicitudes si ya hay una pendiente
        if (user.requestedRole != Role.None) {
            revert RoleAlreadyRequested();
        }

        user.requestedRole = desiredRole;
        emit RoleRequested(msg.sender, desiredRole);
    }

<<<<<<< HEAD
    /// @notice Approve a user's role request (admin only)
    /// @param account Address of the user to approve
=======
    /// @notice Aprueba la solicitud de rol de un usuario (solo admin)
    /// @param account Dirección del usuario a aprobar
>>>>>>> dev
    function approveRole(address account) external onlyAdmin {
        User storage user = _users[account];
        Role requested = user.requestedRole;
        if (requested == Role.None) {
            revert RoleNotRequested();
        }
        user.role = requested;
        user.approved = true;
        user.requestedRole = Role.None;

        emit RoleApproved(account, requested);
    }

<<<<<<< HEAD
    /// @notice Reject a user's role request (admin only)
    /// @param account Address of the user to reject
=======
    /// @notice Rechaza la solicitud de rol de un usuario (solo admin)
    /// @param account Dirección del usuario a rechazar
>>>>>>> dev
    function rejectRole(address account) external onlyAdmin {
        User storage user = _users[account];
        Role requested = user.requestedRole;
        if (requested == Role.None) {
            revert RoleNotRequested();
        }
        user.requestedRole = Role.None;

        emit RoleRejected(account, requested);
    }

<<<<<<< HEAD
    /// @notice Allow a user to cancel their own pending role request
=======
    /// @notice Permite a un usuario cancelar su propia solicitud de rol pendiente
>>>>>>> dev
    /// @dev Mejora extra: da control al usuario para retirar su solicitud
    function cancelRequest() external {
        User storage user = _users[msg.sender];
        if (user.requestedRole == Role.None) {
            revert RoleNotRequested();
        }

        Role requested = user.requestedRole;
        user.requestedRole = Role.None;

        // Opcionalmente, podrías emitir RoleRejected con msg.sender para dejar traza on-chain
        emit RoleRejected(msg.sender, requested);
    }

<<<<<<< HEAD
    /// @notice Revoke an approved user's role (admin only)
    /// @param account Address of the user to revoke
=======
    /// @notice Revoca el rol de un usuario aprobado (solo admin)
    /// @param account Dirección del usuario a revocar
>>>>>>> dev
    function revokeRole(address account) external onlyAdmin {
        User storage user = _users[account];
        if (!user.approved || user.role == Role.None) {
            revert NotApproved();
        }
        Role previousRole = user.role;
        user.role = Role.None;
        user.approved = false;
        user.requestedRole = Role.None;

        emit RoleRevoked(account, previousRole);
    }

    // =====================
    // View helpers
    // =====================

<<<<<<< HEAD
    /// @notice Get user information
    /// @param account Address of the user
    /// @return User struct containing role, approval status, and requested role
=======
    /// @notice Obtiene la información de un usuario
    /// @param account Dirección del usuario
    /// @return Estructura User que contiene el rol, estado de aprobación y rol solicitado
>>>>>>> dev
    function getUser(address account) external view returns (User memory) {
        return _users[account];
    }

<<<<<<< HEAD
    /// @notice Check if an account has a specific approved role
    /// @param account Address to check
    /// @param expectedRole Role to verify
    /// @return True if the account has the expected approved role
=======
    /// @notice Verifica si una cuenta tiene un rol aprobado específico
    /// @param account Dirección a verificar
    /// @param expectedRole Rol a verificar
    /// @return True si la cuenta tiene el rol aprobado esperado
>>>>>>> dev
    function hasRole(
        address account,
        Role expectedRole
    ) external view returns (bool) {
        User memory user = _users[account];
        return user.approved && user.role == expectedRole;
    }

<<<<<<< HEAD
    /// @notice Get the role of an account
    /// @param account Address to check
    /// @return The current role of the account
=======
    /// @notice Obtiene el rol de una cuenta
    /// @param account Dirección a verificar
    /// @return El rol actual de la cuenta
>>>>>>> dev
    function getUserRole(address account) external view returns (Role) {
        return _users[account].role;
    }

<<<<<<< HEAD
    /// @notice Check if an account is approved
    /// @param account Address to check
    /// @return True if the account is approved
=======
    /// @notice Verifica si una cuenta está aprobada
    /// @param account Dirección a verificar
    /// @return True si la cuenta está aprobada
>>>>>>> dev
    function isApproved(address account) external view returns (bool) {
        return _users[account].approved;
    }
}
