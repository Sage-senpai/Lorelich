// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IERC5192} from "./interfaces/IERC5192.sol";

/// @title SoulboundStory
/// @notice Non-transferable (soulbound) ERC721 token. One token per story upload.
///         Implements ERC5192 — all tokens are permanently locked at mint.
///         Only addresses with MINTER_ROLE (LoreVault contract) can mint.
contract SoulboundStory is ERC721, AccessControl, IERC5192 {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    // tokenId → storyId (on LoreVault)
    mapping(uint256 => uint256) public tokenToStory;

    // tokenId → metadata URI
    mapping(uint256 => string) private _tokenURIs;

    uint256 private _nextTokenId;

    // ─────────────────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────────────────

    event StoryMinted(address indexed to, uint256 indexed tokenId, uint256 indexed storyId);

    // ─────────────────────────────────────────────────────────
    // Constructor
    // ─────────────────────────────────────────────────────────

    constructor() ERC721("LoreLich Story", "LORE") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    // ─────────────────────────────────────────────────────────
    // Minting
    // ─────────────────────────────────────────────────────────

    /// @notice Mint a soulbound story token. Only callable by MINTER_ROLE (LoreVault).
    /// @param to       The story uploader — receives the token
    /// @param storyId  The story ID in LoreVault
    /// @param uri      IPFS/Arweave URI for story metadata JSON
    function mint(address to, uint256 storyId, string calldata uri)
        external
        onlyRole(MINTER_ROLE)
        returns (uint256 tokenId)
    {
        tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        tokenToStory[tokenId] = storyId;
        _tokenURIs[tokenId] = uri;

        emit Locked(tokenId);
        emit StoryMinted(to, tokenId, storyId);
    }

    // ─────────────────────────────────────────────────────────
    // ERC5192 — Soulbound
    // ─────────────────────────────────────────────────────────

    /// @notice All tokens are permanently locked. Always returns true.
    function locked(uint256 tokenId) external view override returns (bool) {
        _requireOwned(tokenId);
        return true;
    }

    // ─────────────────────────────────────────────────────────
    // ERC721 Transfer Overrides — Revert All Transfers
    // ─────────────────────────────────────────────────────────

    function transferFrom(address, address, uint256) public pure override {
        revert("SoulboundStory: non-transferable");
    }

    function safeTransferFrom(address, address, uint256, bytes memory) public pure override {
        revert("SoulboundStory: non-transferable");
    }

    function approve(address, uint256) public pure override {
        revert("SoulboundStory: non-transferable");
    }

    function setApprovalForAll(address, bool) public pure override {
        revert("SoulboundStory: non-transferable");
    }

    // ─────────────────────────────────────────────────────────
    // Metadata
    // ─────────────────────────────────────────────────────────

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        return _tokenURIs[tokenId];
    }

    // ─────────────────────────────────────────────────────────
    // Admin
    // ─────────────────────────────────────────────────────────

    function grantMinterRole(address minter) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(MINTER_ROLE, minter);
    }

    function revokeMinterRole(address minter) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(MINTER_ROLE, minter);
    }

    // ─────────────────────────────────────────────────────────
    // ERC165
    // ─────────────────────────────────────────────────────────

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, AccessControl)
        returns (bool)
    {
        return
            interfaceId == type(IERC5192).interfaceId ||
            super.supportsInterface(interfaceId);
    }
}
