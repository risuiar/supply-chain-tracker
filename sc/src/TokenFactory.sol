// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./RoleManager.sol";

/// @title TokenFactory
/// @notice Creates and manages product tokens in the supply chain
contract TokenFactory {
    enum AssetType {
        RawMaterial,
        ProcessedGood
    }

    struct Token {
        uint256 id;
        string productName;
        AssetType assetType;
        string metadataURI;
        address creator;
        address currentHolder;
        RoleManager.Role currentRole;
        uint64 createdAt;
        uint256[] parentIds;
        bool exists;
    }

    error NotApproved();
    error AssetDoesNotExist();
    error MissingParentAssets();
    error InvalidRoleTransition();
    error Unauthorized();

    event TokenCreated(
        uint256 indexed tokenId,
        string productName,
        AssetType assetType,
        address indexed creator,
        string metadataURI
    );

    event TokenTransferred(
        uint256 indexed tokenId,
        address indexed from,
        address indexed to
    );

    RoleManager public immutable roleManager;
    uint256 private _tokenIdTracker;

    mapping(uint256 => Token) private _tokens;
    mapping(address => uint256[]) private _userTokens;

    constructor(address _roleManager) {
        roleManager = RoleManager(_roleManager);
    }

    modifier onlyApproved(RoleManager.Role expectedRole) {
        if (!roleManager.hasRole(msg.sender, expectedRole)) {
            revert NotApproved();
        }
        _;
    }

    /// @notice Create a raw material token (Producer only)
    /// @param productName Name of the product
    /// @param metadataURI URI pointing to token metadata
    /// @return tokenId The ID of the created token
    function createRawToken(
        string calldata productName,
        string calldata metadataURI
    ) external onlyApproved(RoleManager.Role.Producer) returns (uint256 tokenId) {
        tokenId = _mintToken(
            productName,
            metadataURI,
            AssetType.RawMaterial,
            new uint256[](0)
        );
    }

    /// @notice Create a processed goods token from raw materials (Factory only)
    /// @param productName Name of the processed product
    /// @param metadataURI URI pointing to token metadata
    /// @param parentIds Array of parent token IDs used to create this token
    /// @return tokenId The ID of the created token
    function createProcessedToken(
        string calldata productName,
        string calldata metadataURI,
        uint256[] calldata parentIds
    ) external onlyApproved(RoleManager.Role.Factory) returns (uint256 tokenId) {
        if (parentIds.length == 0) {
            revert MissingParentAssets();
        }

        uint256[] memory parentCopy = new uint256[](parentIds.length);

        for (uint256 i; i < parentIds.length; ++i) {
            Token storage parent = _tokens[parentIds[i]];
            if (!parent.exists) {
                revert AssetDoesNotExist();
            }
            if (parent.currentHolder != msg.sender) {
                revert InvalidRoleTransition();
            }

            parentCopy[i] = parentIds[i];
        }

        tokenId = _mintToken(productName, metadataURI, AssetType.ProcessedGood, parentCopy);
    }

    /// @notice Get token information
    /// @param tokenId ID of the token
    /// @return Token struct containing all token data
    function getToken(uint256 tokenId) external view returns (Token memory) {
        Token memory token = _tokens[tokenId];
        if (!token.exists) {
            revert AssetDoesNotExist();
        }
        return token;
    }

    /// @notice Get all tokens owned by an address
    /// @param account Address to query
    /// @return Array of token IDs owned by the account
    function getUserTokens(address account) external view returns (uint256[] memory) {
        return _userTokens[account];
    }

    /// @notice Get the current holder of a token
    /// @param tokenId ID of the token
    /// @return Address of the current holder
    function getTokenHolder(uint256 tokenId) external view returns (address) {
        if (!_tokens[tokenId].exists) {
            revert AssetDoesNotExist();
        }
        return _tokens[tokenId].currentHolder;
    }

    /// @notice Internal function to transfer token ownership (called by TransferManager)
    /// @param tokenId ID of the token to transfer
    /// @param to New owner address
    function transferToken(uint256 tokenId, address to) external {
        Token storage token = _tokens[tokenId];
        if (!token.exists) {
            revert AssetDoesNotExist();
        }

        address from = token.currentHolder;
        RoleManager.Role toRole = roleManager.getUserRole(to);

        token.currentHolder = to;
        token.currentRole = toRole;

        // Update user token lists
        _removeTokenFromUser(from, tokenId);
        _userTokens[to].push(tokenId);

        emit TokenTransferred(tokenId, from, to);
    }

    /// @notice Internal minting function
    function _mintToken(
        string calldata productName,
        string calldata metadataURI,
        AssetType assetType,
        uint256[] memory parentIds
    ) private returns (uint256 tokenId) {
        tokenId = ++_tokenIdTracker;

        Token storage token = _tokens[tokenId];
        token.id = tokenId;
        token.productName = productName;
        token.assetType = assetType;
        token.metadataURI = metadataURI;
        token.creator = msg.sender;
        token.currentHolder = msg.sender;
        token.currentRole = roleManager.getUserRole(msg.sender);
        token.createdAt = uint64(block.timestamp);
        token.exists = true;

        if (parentIds.length > 0) {
            token.parentIds = parentIds;
        }

        _userTokens[msg.sender].push(tokenId);

        emit TokenCreated(tokenId, productName, assetType, msg.sender, metadataURI);
    }

    /// @notice Remove a token from a user's token list
    function _removeTokenFromUser(address user, uint256 tokenId) private {
        uint256[] storage tokens = _userTokens[user];
        uint256 length = tokens.length;
        
        for (uint256 i; i < length; ++i) {
            if (tokens[i] == tokenId) {
                tokens[i] = tokens[length - 1];
                tokens.pop();
                break;
            }
        }
    }
}
