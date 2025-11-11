// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title RoleManager
/// @notice Manages user roles and access control for the supply chain
contract RoleManager {
    enum Role {
        None,
        Producer,
        Factory,
        Retailer,
        Consumer
    }

    struct User {
        Role role;
        bool approved;
        Role requestedRole;
    }

    error NotAdmin();
    error RoleNotRequested();
    error InvalidRoleRequest();
    error NotApproved();

    event RoleRequested(address indexed account, Role indexed requestedRole);
    event RoleApproved(address indexed account, Role indexed role);
    event RoleRejected(address indexed account, Role indexed requestedRole);
    event RoleRevoked(address indexed account, Role indexed previousRole);

    address public immutable admin;
    mapping(address => User) private _users;

    constructor() {
        admin = msg.sender;
    }

    modifier onlyAdmin() {
        if (msg.sender != admin) {
            revert NotAdmin();
        }
        _;
    }

    /// @notice Request a role in the supply chain
    /// @param desiredRole The role being requested
    function requestRole(Role desiredRole) external {
        if (desiredRole == Role.None) {
            revert InvalidRoleRequest();
        }
        User storage user = _users[msg.sender];
        user.requestedRole = desiredRole;
        emit RoleRequested(msg.sender, desiredRole);
    }

    /// @notice Approve a user's role request (admin only)
    /// @param account Address of the user to approve
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

    /// @notice Reject a user's role request (admin only)
    /// @param account Address of the user to reject
    function rejectRole(address account) external onlyAdmin {
        User storage user = _users[account];
        Role requested = user.requestedRole;
        if (requested == Role.None) {
            revert RoleNotRequested();
        }
        user.requestedRole = Role.None;

        emit RoleRejected(account, requested);
    }

    /// @notice Revoke an approved user's role (admin only)
    /// @param account Address of the user to revoke
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

    /// @notice Get user information
    /// @param account Address of the user
    /// @return User struct containing role, approval status, and requested role
    function getUser(address account) external view returns (User memory) {
        return _users[account];
    }

    /// @notice Check if an account has a specific approved role
    /// @param account Address to check
    /// @param expectedRole Role to verify
    /// @return True if the account has the expected approved role
    function hasRole(address account, Role expectedRole) external view returns (bool) {
        User memory user = _users[account];
        return user.approved && user.role == expectedRole;
    }

    /// @notice Get the role of an account
    /// @param account Address to check
    /// @return The current role of the account
    function getUserRole(address account) external view returns (Role) {
        return _users[account].role;
    }

    /// @notice Check if an account is approved
    /// @param account Address to check
    /// @return True if the account is approved
    function isApproved(address account) external view returns (bool) {
        return _users[account].approved;
    }
}
