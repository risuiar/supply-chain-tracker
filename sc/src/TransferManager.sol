// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./RoleManager.sol";
import "./TokenFactory.sol";

/// @title TransferManager
<<<<<<< HEAD
/// @notice Manages token transfers between supply chain participants
=======
/// @notice Gestiona las transferencias de tokens entre participantes de la cadena de suministro
>>>>>>> dev
contract TransferManager {
    enum TransferStatus {
        None,
        Pending,
        Approved,
        Rejected
    }

    struct Transfer {
        uint256 id;
        uint256 tokenId;
        address from;
        address to;
        uint256 amount;
        RoleManager.Role fromRole;
        RoleManager.Role toRole;
        TransferStatus status;
        uint64 requestedAt;
        uint64 resolvedAt;
    }

    error NotApproved();
    error InvalidAddress();
<<<<<<< HEAD
    error AssetDoesNotExist();
=======
    error InvalidAmount();
>>>>>>> dev
    error Unauthorized();
    error InvalidRoleTransition();
    error TransferNotPending();
    error TransferAlreadyPending();
    error NotTokenCreator();

    event TransferRequested(
        uint256 indexed tokenId,
        uint256 indexed transferId,
        address indexed to
    );

    event TransferResolved(uint256 indexed transferId, TransferStatus status);

    RoleManager public immutable roleManager;
    TokenFactory public immutable tokenFactory;
    address public immutable admin;

    uint256 private _transferIdTracker;
    mapping(uint256 => Transfer) private _transfers;
    mapping(uint256 => uint256[]) private _tokenTransfers;
    mapping(uint256 => uint256) private _pendingTransferByToken;

    mapping(RoleManager.Role => RoleManager.Role) private _nextRole;

    constructor(address _roleManager, address _tokenFactory) {
        roleManager = RoleManager(_roleManager);
        tokenFactory = TokenFactory(_tokenFactory);
        admin = roleManager.admin();

<<<<<<< HEAD
        // Define valid role transitions
=======
        // Define las transiciones válidas de roles
>>>>>>> dev
        _nextRole[RoleManager.Role.Producer] = RoleManager.Role.Factory;
        _nextRole[RoleManager.Role.Factory] = RoleManager.Role.Retailer;
        _nextRole[RoleManager.Role.Retailer] = RoleManager.Role.Consumer;
    }

<<<<<<< HEAD
    /// @notice Request a token transfer to the next role in the supply chain
    /// @param tokenId ID of the token to transfer
    /// @param to Address of the recipient
    /// @param amount Amount of tokens to transfer
    /// @return transferId The ID of the created transfer request
=======
    /// @notice Solicita una transferencia de token al siguiente rol en la cadena de suministro
    /// @param tokenId ID del token a transferir
    /// @param to Dirección del destinatario
    /// @param amount Cantidad de tokens a transferir
    /// @return transferId El ID de la solicitud de transferencia creada
>>>>>>> dev
    function requestTransfer(
        uint256 tokenId,
        address to,
        uint256 amount
    ) external returns (uint256 transferId) {
        if (to == address(0)) {
            revert InvalidAddress();
        }

        if (amount == 0) {
<<<<<<< HEAD
            revert InvalidAddress(); // Reusing error for simplicity
        }

        // Check if sender has enough balance
=======
            revert InvalidAmount();
        }

        // Verifica si el remitente tiene suficiente balance
>>>>>>> dev
        uint256 balance = tokenFactory.balanceOf(tokenId, msg.sender);
        if (balance < amount) {
            revert Unauthorized();
        }

<<<<<<< HEAD
        // Verify sender is approved
=======
        // Verifica que el remitente esté aprobado
>>>>>>> dev
        if (!roleManager.isApproved(msg.sender)) {
            revert NotApproved();
        }

        RoleManager.Role senderRole = roleManager.getUserRole(msg.sender);
        RoleManager.Role expectedNext = _nextRole[senderRole];

        if (expectedNext == RoleManager.Role.None) {
            revert InvalidRoleTransition();
        }

<<<<<<< HEAD
        // Verify recipient has the expected next role
=======
        // Verifica que el destinatario tenga el siguiente rol esperado
>>>>>>> dev
        if (!roleManager.hasRole(to, expectedNext)) {
            revert InvalidRoleTransition();
        }

<<<<<<< HEAD
        // Get token information
        TokenFactory.Token memory token = tokenFactory.getToken(tokenId);
        
        // Validate transfer permissions based on role:
        // - Producer: Can only transfer RawMaterial tokens they created
        // - Factory: Can only transfer ProcessedGood tokens they created
        // - Retailer: Can transfer any token they possess (received from Factory)
        // - Consumer: Cannot transfer (expectedNext would be None, already checked above)
        if (senderRole == RoleManager.Role.Producer) {
            // Producer can only transfer RawMaterial tokens they created
=======
        // Obtiene la información del token
        TokenFactory.Token memory token = tokenFactory.getToken(tokenId);
        
        // Valida los permisos de transferencia según el rol:
        // - Producer: Solo puede transferir tokens RawMaterial que haya creado
        // - Factory: Solo puede transferir tokens ProcessedGood que haya creado
        // - Retailer: Puede transferir cualquier token que posea (recibido de Factory)
        // - Consumer: No puede transferir (expectedNext sería None, ya verificado arriba)
        if (senderRole == RoleManager.Role.Producer) {
            // El productor solo puede transferir tokens RawMaterial que haya creado
>>>>>>> dev
            if (token.creator != msg.sender) {
                revert NotTokenCreator();
            }
            if (token.assetType != TokenFactory.AssetType.RawMaterial) {
                revert InvalidRoleTransition();
            }
        } else if (senderRole == RoleManager.Role.Factory) {
<<<<<<< HEAD
            // Factory can only transfer ProcessedGood tokens they created
=======
            // La fábrica solo puede transferir tokens ProcessedGood que haya creado
>>>>>>> dev
            if (token.creator != msg.sender) {
                revert NotTokenCreator();
            }
            if (token.assetType != TokenFactory.AssetType.ProcessedGood) {
                revert InvalidRoleTransition();
            }
        }
<<<<<<< HEAD
        // Retailer can transfer any token they have balance of (no creator check)

        // Check for pending transfers
=======
        // El minorista puede transferir cualquier token del que tenga balance (sin verificar creador)

        // Verifica si hay transferencias pendientes
>>>>>>> dev
        if (_pendingTransferByToken[tokenId] != 0) {
            revert TransferAlreadyPending();
        }

        transferId = ++_transferIdTracker;
        _pendingTransferByToken[tokenId] = transferId;
        _tokenTransfers[tokenId].push(transferId);

        Transfer storage transfer = _transfers[transferId];
        transfer.id = transferId;
        transfer.tokenId = tokenId;
        transfer.from = msg.sender;
        transfer.to = to;
        transfer.amount = amount;
        transfer.fromRole = senderRole;
        transfer.toRole = expectedNext;
        transfer.status = TransferStatus.Pending;
        transfer.requestedAt = uint64(block.timestamp);

        emit TransferRequested(tokenId, transferId, to);
    }

<<<<<<< HEAD
    /// @notice Approve a pending transfer (recipient or admin only)
    /// @param transferId ID of the transfer to approve
=======
    /// @notice Aprueba una transferencia pendiente (solo destinatario o admin)
    /// @param transferId ID de la transferencia a aprobar
>>>>>>> dev
    function approveTransfer(uint256 transferId) external {
        Transfer storage transfer = _transfers[transferId];
        if (transfer.status != TransferStatus.Pending) {
            revert TransferNotPending();
        }
        if (transfer.to != msg.sender && msg.sender != admin) {
            revert Unauthorized();
        }

<<<<<<< HEAD
        // Execute the transfer in TokenFactory
=======
        // Ejecuta la transferencia en TokenFactory
>>>>>>> dev
        tokenFactory.transferToken(
            transfer.tokenId,
            transfer.from,
            transfer.to,
            transfer.amount
        );

        transfer.status = TransferStatus.Approved;
        transfer.resolvedAt = uint64(block.timestamp);
        _pendingTransferByToken[transfer.tokenId] = 0;

        emit TransferResolved(transferId, TransferStatus.Approved);
    }

<<<<<<< HEAD
    /// @notice Reject a pending transfer (recipient or admin only)
    /// @param transferId ID of the transfer to reject
=======
    /// @notice Rechaza una transferencia pendiente (solo destinatario o admin)
    /// @param transferId ID de la transferencia a rechazar
>>>>>>> dev
    function rejectTransfer(uint256 transferId) external {
        Transfer storage transfer = _transfers[transferId];
        if (transfer.status != TransferStatus.Pending) {
            revert TransferNotPending();
        }
        if (transfer.to != msg.sender && msg.sender != admin) {
            revert Unauthorized();
        }

        transfer.status = TransferStatus.Rejected;
        transfer.resolvedAt = uint64(block.timestamp);
        _pendingTransferByToken[transfer.tokenId] = 0;

        emit TransferResolved(transferId, TransferStatus.Rejected);
    }

<<<<<<< HEAD
    /// @notice Get transfer information
    /// @param transferId ID of the transfer
    /// @return Transfer struct containing all transfer data
=======
    /// @notice Obtiene la información de una transferencia
    /// @param transferId ID de la transferencia
    /// @return Estructura Transfer con todos los datos de la transferencia
>>>>>>> dev
    function getTransfer(
        uint256 transferId
    ) external view returns (Transfer memory) {
        return _transfers[transferId];
    }

<<<<<<< HEAD
    /// @notice Get all transfers for a specific token
    /// @param tokenId ID of the token
    /// @return history Array of Transfer structs representing the token's transfer history
=======
    /// @notice Obtiene todas las transferencias de un token específico
    /// @param tokenId ID del token
    /// @return history Array de estructuras Transfer que representan el historial de transferencias del token
>>>>>>> dev
    function getTokenTransfers(
        uint256 tokenId
    ) external view returns (Transfer[] memory history) {
        uint256[] storage ids = _tokenTransfers[tokenId];
        uint256 length = ids.length;
        history = new Transfer[](length);
        for (uint256 i; i < length; ++i) {
            history[i] = _transfers[ids[i]];
        }
    }

<<<<<<< HEAD
    /// @notice Get pending transfer ID for a token
    /// @param tokenId ID of the token
    /// @return Transfer ID if pending, 0 otherwise
=======
    /// @notice Obtiene el ID de la transferencia pendiente de un token
    /// @param tokenId ID del token
    /// @return ID de la transferencia si está pendiente, 0 en caso contrario
>>>>>>> dev
    function getPendingTransfer(
        uint256 tokenId
    ) external view returns (uint256) {
        return _pendingTransferByToken[tokenId];
    }
}
