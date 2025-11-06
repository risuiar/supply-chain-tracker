// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title SupplyChainTracker
/// @notice Implements the end-to-end lifecycle required for the educational supply chain
/// project: role onboarding, asset tokenisation, controlled transfers and immutable history.
contract SupplyChainTracker {
    enum Role {
        None,
        Producer,
        Factory,
        Retailer,
        Consumer
    }

    enum AssetType {
        RawMaterial,
        ProcessedGood
    }

    enum TransferStatus {
        None,
        Pending,
        Approved,
        Rejected
    }

    struct User {
        Role role;
        bool approved;
        Role requestedRole;
    }

    struct Asset {
        uint256 id;
        AssetType assetType;
        string metadataURI;
        address creator;
        address currentHolder;
        Role currentRole;
        uint64 createdAt;
        uint256[] parentIds;
        bool exists;
    }

    struct Transfer {
        uint256 id;
        uint256 assetId;
        address from;
        address to;
        Role fromRole;
        Role toRole;
        TransferStatus status;
        uint64 requestedAt;
        uint64 resolvedAt;
    }

    error NotAdmin();
    error RoleNotRequested();
    error NotApproved();
    error Unauthorized();
    error InvalidRoleTransition();
    error InvalidRoleRequest();
    error InvalidAddress();
    error AssetDoesNotExist();
    error TransferNotPending();
    error TransferAlreadyPending();
    error MissingParentAssets();

    event RoleRequested(address indexed account, Role indexed requestedRole);
    event RoleApproved(address indexed account, Role indexed role);
    event RoleRejected(address indexed account, Role indexed requestedRole);

    event AssetCreated(
        uint256 indexed assetId,
        AssetType assetType,
        address indexed creator,
        string metadataURI
    );

    event TransferRequested(
        uint256 indexed assetId,
        uint256 indexed transferId,
        address indexed to
    );

    event TransferResolved(uint256 indexed transferId, TransferStatus status);

    address public immutable admin;
    uint256 private _assetIdTracker;
    uint256 private _transferIdTracker;

    mapping(address => User) private _users;
    mapping(uint256 => Asset) private _assets;
    mapping(uint256 => Transfer) private _transfers;
    mapping(uint256 => uint256[]) private _assetTransfers;
    mapping(uint256 => uint256) private _pendingTransferByAsset;

    mapping(Role => Role) private _nextRole;

    constructor() {
        admin = msg.sender;
        _nextRole[Role.Producer] = Role.Factory;
        _nextRole[Role.Factory] = Role.Retailer;
        _nextRole[Role.Retailer] = Role.Consumer;
    }

    modifier onlyAdmin() {
        if (msg.sender != admin) {
            revert NotAdmin();
        }
        _;
    }

    modifier onlyApproved(Role expectedRole) {
        User memory user = _users[msg.sender];
        if (!user.approved || user.role != expectedRole) {
            revert NotApproved();
        }
        _;
    }

    function getUser(address account) external view returns (User memory) {
        return _users[account];
    }

    function getAsset(uint256 assetId) external view returns (Asset memory) {
        Asset memory asset = _assets[assetId];
        if (!asset.exists) {
            revert AssetDoesNotExist();
        }
        return asset;
    }

    function getTransfer(
        uint256 transferId
    ) external view returns (Transfer memory) {
        return _transfers[transferId];
    }

    function getAssetTransfers(
        uint256 assetId
    ) external view returns (Transfer[] memory history) {
        Asset memory asset = _assets[assetId];
        if (!asset.exists) {
            revert AssetDoesNotExist();
        }

        uint256[] storage ids = _assetTransfers[assetId];
        uint256 length = ids.length;
        history = new Transfer[](length);
        for (uint256 i; i < length; ++i) {
            history[i] = _transfers[ids[i]];
        }
    }

    function requestRole(Role desiredRole) external {
        if (desiredRole == Role.None) {
            revert InvalidRoleRequest();
        }
        User storage user = _users[msg.sender];
        user.requestedRole = desiredRole;
        emit RoleRequested(msg.sender, desiredRole);
    }

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

    function rejectRole(address account) external onlyAdmin {
        User storage user = _users[account];
        Role requested = user.requestedRole;
        if (requested == Role.None) {
            revert RoleNotRequested();
        }
        user.requestedRole = Role.None;

        emit RoleRejected(account, requested);
    }

    function createRawAsset(
        string calldata metadataURI
    ) external onlyApproved(Role.Producer) returns (uint256 assetId) {
        assetId = _mintAsset(
            metadataURI,
            AssetType.RawMaterial,
            new uint256[](0)
        );
    }

    function createProcessedAsset(
        string calldata metadataURI,
        uint256[] calldata parentIds
    ) external onlyApproved(Role.Factory) returns (uint256 assetId) {
        if (parentIds.length == 0) {
            revert MissingParentAssets();
        }

        uint256[] memory parentCopy = new uint256[](parentIds.length);

        for (uint256 i; i < parentIds.length; ++i) {
            Asset storage parent = _assets[parentIds[i]];
            if (!parent.exists) {
                revert AssetDoesNotExist();
            }
            if (parent.currentHolder != msg.sender) {
                revert InvalidRoleTransition();
            }

            parentCopy[i] = parentIds[i];
        }

        assetId = _mintAsset(metadataURI, AssetType.ProcessedGood, parentCopy);
    }

    function requestTransfer(
        uint256 assetId,
        address to
    ) external returns (uint256 transferId) {
        if (to == address(0)) {
            revert InvalidAddress();
        }

        Asset storage asset = _assets[assetId];
        if (!asset.exists) {
            revert AssetDoesNotExist();
        }
        if (asset.currentHolder != msg.sender) {
            revert Unauthorized();
        }

        User memory sender = _users[msg.sender];
        if (!sender.approved) {
            revert NotApproved();
        }

        Role expectedNext = _nextRole[sender.role];
        if (expectedNext == Role.None) {
            revert InvalidRoleTransition();
        }

        User memory recipient = _users[to];
        if (!recipient.approved || recipient.role != expectedNext) {
            revert InvalidRoleTransition();
        }

        if (_pendingTransferByAsset[assetId] != 0) {
            revert TransferAlreadyPending();
        }

        transferId = ++_transferIdTracker;
        _pendingTransferByAsset[assetId] = transferId;
        _assetTransfers[assetId].push(transferId);

        Transfer storage transfer = _transfers[transferId];
        transfer.id = transferId;
        transfer.assetId = assetId;
        transfer.from = msg.sender;
        transfer.to = to;
        transfer.fromRole = sender.role;
        transfer.toRole = recipient.role;
        transfer.status = TransferStatus.Pending;
        transfer.requestedAt = uint64(block.timestamp);

        emit TransferRequested(assetId, transferId, to);
    }

    function approveTransfer(uint256 transferId) external {
        Transfer storage transfer = _transfers[transferId];
        if (transfer.status != TransferStatus.Pending) {
            revert TransferNotPending();
        }
        if (transfer.to != msg.sender && msg.sender != admin) {
            revert Unauthorized();
        }

        Asset storage asset = _assets[transfer.assetId];
        asset.currentHolder = transfer.to;
        asset.currentRole = transfer.toRole;

        transfer.status = TransferStatus.Approved;
        transfer.resolvedAt = uint64(block.timestamp);
        _pendingTransferByAsset[transfer.assetId] = 0;

        emit TransferResolved(transferId, TransferStatus.Approved);
    }

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
        _pendingTransferByAsset[transfer.assetId] = 0;

        emit TransferResolved(transferId, TransferStatus.Rejected);
    }

    function _mintAsset(
        string calldata metadataURI,
        AssetType assetType,
        uint256[] memory parentIds
    ) private returns (uint256 assetId) {
        assetId = ++_assetIdTracker;

        Asset storage asset = _assets[assetId];
        asset.id = assetId;
        asset.assetType = assetType;
        asset.metadataURI = metadataURI;
        asset.creator = msg.sender;
        asset.currentHolder = msg.sender;
        asset.currentRole = _users[msg.sender].role;
        asset.createdAt = uint64(block.timestamp);
        asset.exists = true;

        if (parentIds.length > 0) {
            asset.parentIds = parentIds;
        }

        emit AssetCreated(assetId, assetType, msg.sender, metadataURI);
    }
}
