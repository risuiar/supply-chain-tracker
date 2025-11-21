// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./RoleManager.sol";

/// @title TokenFactory
/// @notice Crea y gestiona tokens de productos en la cadena de suministro
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
        uint256 totalSupply;
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
    error InsufficientBalance();
    error InvalidAmountArray();

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
    mapping(uint256 => mapping(address => uint256)) private _balances; // tokenId => usuario => balance

    constructor(address _roleManager) {
        roleManager = RoleManager(_roleManager);
    }

    modifier onlyApproved(RoleManager.Role expectedRole) {
        if (!roleManager.hasRole(msg.sender, expectedRole)) {
            revert NotApproved();
        }
        _;
    }

    /// @notice Crea un token de materia prima (solo Productor)
    /// @param productName Nombre del producto
    /// @param metadataURI URI que apunta a los metadatos del token
    /// @param totalSupply Suministro total del token
    /// @return tokenId El ID del token creado
    function createRawToken(
        string calldata productName,
        string calldata metadataURI,
        uint256 totalSupply
    )
        external
        onlyApproved(RoleManager.Role.Producer)
        returns (uint256 tokenId)
    {
        tokenId = _mintToken(
            productName,
            metadataURI,
            totalSupply,
            AssetType.RawMaterial,
            new uint256[](0)
        );
    }

    /// @notice Crea un token de bienes procesados a partir de materias primas (solo Fábrica)
    /// @param productName Nombre del producto procesado
    /// @param metadataURI URI que apunta a los metadatos del token
    /// @param totalSupply Suministro total del token
    /// @param parentIds Array de IDs de tokens padre utilizados para crear este token
    /// @return tokenId El ID del token creado
    function createProcessedToken(
        string calldata productName,
        string calldata metadataURI,
        uint256 totalSupply,
        uint256[] calldata parentIds
    )
        external
        onlyApproved(RoleManager.Role.Factory)
        returns (uint256 tokenId)
    {
        if (parentIds.length == 0) {
            revert MissingParentAssets();
        }

        uint256[] memory parentCopy = new uint256[](parentIds.length);

        for (uint256 i; i < parentIds.length; ++i) {
            Token storage parent = _tokens[parentIds[i]];
            if (!parent.exists) {
                revert AssetDoesNotExist();
            }
            // Verifica que el remitente tenga balance del token padre
            if (_balances[parentIds[i]][msg.sender] == 0) {
                revert InvalidRoleTransition();
            }

            parentCopy[i] = parentIds[i];
        }

        tokenId = _mintToken(
            productName,
            metadataURI,
            totalSupply,
            AssetType.ProcessedGood,
            parentCopy
        );
    }

    /// @notice Crea un token de producto procesado con cantidades específicas de materias primas
    /// @param productName Nombre del producto
    /// @param metadataURI URI de metadatos del token
    /// @param totalSupply Suministro total del token
    /// @param parentIds Array de IDs de tokens padre (materias primas)
    /// @param amounts Array de cantidades a consumir de cada token padre
    /// @return tokenId ID del token creado
    function createProcessedTokenWithAmounts(
        string calldata productName,
        string calldata metadataURI,
        uint256 totalSupply,
        uint256[] calldata parentIds,
        uint256[] calldata amounts
    )
        external
        onlyApproved(RoleManager.Role.Factory)
        returns (uint256 tokenId)
    {
        if (parentIds.length == 0) {
            revert MissingParentAssets();
        }

        if (parentIds.length != amounts.length) {
            revert InvalidAmountArray();
        }

        uint256[] memory parentCopy = new uint256[](parentIds.length);

        for (uint256 i; i < parentIds.length; ++i) {
            Token storage parent = _tokens[parentIds[i]];
            if (!parent.exists) {
                revert AssetDoesNotExist();
            }
            // Solo RawMaterial puede ser usado como token padre
            if (parent.assetType != AssetType.RawMaterial) {
                revert InvalidRoleTransition();
            }

            if (amounts[i] == 0) {
                revert InvalidAmountArray();
            }

            uint256 currentBalance = _balances[parentIds[i]][msg.sender];
            if (currentBalance < amounts[i]) {
                revert InsufficientBalance();
            }

            // Descontar la cantidad especificada del balance
            _balances[parentIds[i]][msg.sender] = currentBalance - amounts[i];

            parentCopy[i] = parentIds[i];
        }

        tokenId = _mintToken(
            productName,
            metadataURI,
            totalSupply,
            AssetType.ProcessedGood,
            parentCopy
        );
    }

    /// @notice Obtiene la información de un token
    /// @param tokenId ID del token
    /// @return Estructura Token con todos los datos del token
    function getToken(uint256 tokenId) external view returns (Token memory) {
        Token memory token = _tokens[tokenId];
        if (!token.exists) {
            revert AssetDoesNotExist();
        }
        return token;
    }

    /// @notice Obtiene todos los tokens propiedad de una dirección
    /// @param account Dirección a consultar
    /// @return Array de IDs de tokens propiedad de la cuenta
    function getUserTokens(
        address account
    ) external view returns (uint256[] memory) {
        return _userTokens[account];
    }

    /// @notice Obtiene el poseedor actual de un token
    /// @param tokenId ID del token
    /// @return Dirección del poseedor actual
    function getTokenHolder(uint256 tokenId) external view returns (address) {
        if (!_tokens[tokenId].exists) {
            revert AssetDoesNotExist();
        }
        return _tokens[tokenId].currentHolder;
    }

    /// @notice Obtiene el balance de un usuario para un token específico
    /// @param tokenId ID del token
    /// @param account Dirección para verificar el balance
    /// @return Balance de la cuenta para este token
    function balanceOf(
        uint256 tokenId,
        address account
    ) external view returns (uint256) {
        if (!_tokens[tokenId].exists) {
            revert AssetDoesNotExist();
        }
        return _balances[tokenId][account];
    }

    /// @notice Función interna para transferir la propiedad de un token (llamada por TransferManager)
    /// @param tokenId ID del token a transferir
    /// @param from Dirección del propietario actual
    /// @param to Dirección del nuevo propietario
    /// @param amount Cantidad a transferir
    function transferToken(
        uint256 tokenId,
        address from,
        address to,
        uint256 amount
    ) external {
        Token storage token = _tokens[tokenId];
        if (!token.exists) {
            revert AssetDoesNotExist();
        }

        // Verifica el balance
        if (_balances[tokenId][from] < amount) {
            revert Unauthorized();
        }

        RoleManager.Role toRole = roleManager.getUserRole(to);

        // Transfiere el balance
        _balances[tokenId][from] -= amount;
        _balances[tokenId][to] += amount;

        // Si el remitente ya no tiene balance, lo elimina de su lista de tokens
        if (_balances[tokenId][from] == 0) {
            _removeTokenFromUser(from, tokenId);
        }

        // Agrega a la lista de tokens del destinatario si aún no la tiene
        if (_balances[tokenId][to] == amount) {
            // Primera vez que recibe este token
            _userTokens[to].push(tokenId);
        }

        // Actualiza el poseedor actual si es una transferencia completa
        if (_balances[tokenId][from] == 0) {
            token.currentHolder = to;
            token.currentRole = toRole;
        }

        emit TokenTransferred(tokenId, from, to);
    }

    /// @notice Función interna de acuñación
    function _mintToken(
        string calldata productName,
        string calldata metadataURI,
        uint256 totalSupply,
        AssetType assetType,
        uint256[] memory parentIds
    ) private returns (uint256 tokenId) {
        tokenId = ++_tokenIdTracker;

        Token storage token = _tokens[tokenId];
        token.id = tokenId;
        token.productName = productName;
        token.assetType = assetType;
        token.metadataURI = metadataURI;
        token.totalSupply = totalSupply;
        token.creator = msg.sender;
        token.currentHolder = msg.sender;
        token.currentRole = roleManager.getUserRole(msg.sender);
        token.createdAt = uint64(block.timestamp);
        token.exists = true;

        if (parentIds.length > 0) {
            token.parentIds = parentIds;
        }

        _userTokens[msg.sender].push(tokenId);
        _balances[tokenId][msg.sender] = totalSupply;

        emit TokenCreated(
            tokenId,
            productName,
            assetType,
            msg.sender,
            metadataURI
        );
    }

    /// @notice Elimina un token de la lista de tokens de un usuario
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
