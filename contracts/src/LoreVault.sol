// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {SoulboundStory} from "./SoulboundStory.sol";

/// @title LoreVault
/// @notice Manages ancestral story vaults. Tracks story metadata,
///         0G storage proofs, private vault access control, and triggers
///         soulbound NFT minting on story upload.
///
/// @dev    All state changes before external calls (CEI). ReentrancyGuard
///         on all state-mutating externals. No ETH value in V1.
contract LoreVault is ReentrancyGuard, Ownable {

    // ─────────────────────────────────────────────────────────
    // Types
    // ─────────────────────────────────────────────────────────

    enum MediaType { AUDIO, VIDEO, TEXT, IMAGE }

    struct Vault {
        address owner;
        string  name;
        bool    isPrivate;
        uint256 storyCount;
        uint256 createdAt;
    }

    struct StoryMetadata {
        address   uploader;
        uint256   vaultId;
        string    zgRootHash;     // 0G merkle root — verifiable DA proof
        string    mediaType;      // human-readable: "audio"|"video"|"text"|"image"
        uint256   duration;       // seconds (0 for text/image)
        bool      isPrivate;
        uint256   timestamp;
        string    title;
        string    encryptedKeyHash; // hash of encrypted AES key (empty if public)
    }

    // ─────────────────────────────────────────────────────────
    // Storage
    // ─────────────────────────────────────────────────────────

    SoulboundStory public immutable soulboundToken;

    mapping(uint256 => Vault)         public vaults;
    mapping(uint256 => StoryMetadata) public stories;

    // vaultId → array of storyIds
    mapping(uint256 => uint256[])     private _vaultStories;

    // vaultId → address → hasAccess (for private vaults)
    mapping(uint256 => mapping(address => bool)) private _vaultAccess;

    // owner → array of vaultIds
    mapping(address => uint256[])     private _ownerVaults;

    uint256 private _nextVaultId;
    uint256 private _nextStoryId;

    // Max stories per vault to prevent unbounded loops
    uint256 public constant MAX_STORIES_PER_VAULT = 10_000;
    uint256 public constant MAX_VAULTS_PER_ADDRESS = 100;

    // ─────────────────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────────────────

    event VaultCreated(uint256 indexed vaultId, address indexed owner, string name, bool isPrivate);
    event StoryUploaded(uint256 indexed storyId, uint256 indexed vaultId, address indexed uploader, string zgRootHash);
    event AccessGranted(uint256 indexed vaultId, address indexed grantee);
    event AccessRevoked(uint256 indexed vaultId, address indexed grantee);

    // ─────────────────────────────────────────────────────────
    // Errors
    // ─────────────────────────────────────────────────────────

    error NotVaultOwner(uint256 vaultId, address caller);
    error VaultNotFound(uint256 vaultId);
    error StoryNotFound(uint256 storyId);
    error AccessDenied(uint256 vaultId, address caller);
    error MaxStoriesReached(uint256 vaultId);
    error MaxVaultsReached(address owner);
    error EmptyString(string field);
    error InvalidDuration();

    // ─────────────────────────────────────────────────────────
    // Modifiers
    // ─────────────────────────────────────────────────────────

    modifier onlyVaultOwner(uint256 vaultId) {
        if (vaults[vaultId].owner == address(0)) revert VaultNotFound(vaultId);
        if (vaults[vaultId].owner != msg.sender) revert NotVaultOwner(vaultId, msg.sender);
        _;
    }

    modifier vaultExists(uint256 vaultId) {
        if (vaults[vaultId].owner == address(0)) revert VaultNotFound(vaultId);
        _;
    }

    modifier canAccessVault(uint256 vaultId) {
        Vault storage v = vaults[vaultId];
        if (v.owner == address(0)) revert VaultNotFound(vaultId);
        if (v.isPrivate && v.owner != msg.sender && !_vaultAccess[vaultId][msg.sender]) {
            revert AccessDenied(vaultId, msg.sender);
        }
        _;
    }

    // ─────────────────────────────────────────────────────────
    // Constructor
    // ─────────────────────────────────────────────────────────

    constructor(address _soulboundToken) Ownable(msg.sender) {
        soulboundToken = SoulboundStory(_soulboundToken);
    }

    // ─────────────────────────────────────────────────────────
    // Vault Management
    // ─────────────────────────────────────────────────────────

    /// @notice Create a new vault.
    /// @param name      Human-readable vault name (e.g., "Okafor Family Stories")
    /// @param isPrivate If true, only owner + granted addresses can access stories
    function createVault(string calldata name, bool isPrivate)
        external
        nonReentrant
        returns (uint256 vaultId)
    {
        if (bytes(name).length == 0) revert EmptyString("name");
        if (_ownerVaults[msg.sender].length >= MAX_VAULTS_PER_ADDRESS) {
            revert MaxVaultsReached(msg.sender);
        }

        vaultId = _nextVaultId++;

        vaults[vaultId] = Vault({
            owner:      msg.sender,
            name:       name,
            isPrivate:  isPrivate,
            storyCount: 0,
            createdAt:  block.timestamp
        });

        _ownerVaults[msg.sender].push(vaultId);
        // Vault owner always has access to their own private vault
        _vaultAccess[vaultId][msg.sender] = true;

        emit VaultCreated(vaultId, msg.sender, name, isPrivate);
    }

    // ─────────────────────────────────────────────────────────
    // Story Upload
    // ─────────────────────────────────────────────────────────

    /// @notice Record a story upload. Caller must have uploaded the blob to 0G first.
    /// @param vaultId          The vault to attach this story to
    /// @param zgRootHash       0G merkle root hash returned after upload
    /// @param title            Story title
    /// @param mediaTypeStr     "audio" | "video" | "text" | "image"
    /// @param duration         Duration in seconds (0 for text/image)
    /// @param encryptedKeyHash Hash of encrypted AES key (empty string if public)
    /// @param tokenURI         Metadata URI for the soulbound NFT
    function uploadStory(
        uint256 vaultId,
        string calldata zgRootHash,
        string calldata title,
        string calldata mediaTypeStr,
        uint256 duration,
        string calldata encryptedKeyHash,
        string calldata tokenURI
    )
        external
        nonReentrant
        onlyVaultOwner(vaultId)
        returns (uint256 storyId)
    {
        if (bytes(zgRootHash).length == 0) revert EmptyString("zgRootHash");
        if (bytes(title).length == 0)      revert EmptyString("title");
        if (_vaultStories[vaultId].length >= MAX_STORIES_PER_VAULT) {
            revert MaxStoriesReached(vaultId);
        }

        storyId = _nextStoryId++;

        stories[storyId] = StoryMetadata({
            uploader:         msg.sender,
            vaultId:          vaultId,
            zgRootHash:       zgRootHash,
            mediaType:        mediaTypeStr,
            duration:         duration,
            isPrivate:        vaults[vaultId].isPrivate,
            timestamp:        block.timestamp,
            title:            title,
            encryptedKeyHash: encryptedKeyHash
        });

        _vaultStories[vaultId].push(storyId);
        vaults[vaultId].storyCount++;

        // Mint soulbound token — state changes done, safe to call external
        soulboundToken.mint(msg.sender, storyId, tokenURI);

        emit StoryUploaded(storyId, vaultId, msg.sender, zgRootHash);
    }

    // ─────────────────────────────────────────────────────────
    // Access Control (Private Vaults)
    // ─────────────────────────────────────────────────────────

    /// @notice Grant a specific address access to a private vault.
    function grantAccess(uint256 vaultId, address grantee)
        external
        nonReentrant
        onlyVaultOwner(vaultId)
    {
        _vaultAccess[vaultId][grantee] = true;
        emit AccessGranted(vaultId, grantee);
    }

    /// @notice Revoke an address's access to a private vault.
    function revokeAccess(uint256 vaultId, address grantee)
        external
        nonReentrant
        onlyVaultOwner(vaultId)
    {
        // Cannot revoke owner's own access
        require(grantee != vaults[vaultId].owner, "LoreVault: cannot revoke owner access");
        _vaultAccess[vaultId][grantee] = false;
        emit AccessRevoked(vaultId, grantee);
    }

    function hasAccess(uint256 vaultId, address user) external view returns (bool) {
        Vault storage v = vaults[vaultId];
        if (v.owner == address(0)) return false;
        if (!v.isPrivate) return true;
        return _vaultAccess[vaultId][user];
    }

    // ─────────────────────────────────────────────────────────
    // Read Functions
    // ─────────────────────────────────────────────────────────

    function getVaultStories(uint256 vaultId)
        external
        view
        canAccessVault(vaultId)
        returns (uint256[] memory)
    {
        return _vaultStories[vaultId];
    }

    function getOwnerVaults(address owner) external view returns (uint256[] memory) {
        return _ownerVaults[owner];
    }

    function totalVaults() external view returns (uint256) {
        return _nextVaultId;
    }

    function totalStories() external view returns (uint256) {
        return _nextStoryId;
    }
}
