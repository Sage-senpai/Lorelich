// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/// @title LoreRichComic
/// @notice Tradable ERC721 representing AI-generated comic NFTs built from
///         ancestral lore. Comics are community assets — not soulbound.
/// @dev    Comic JSON is stored on 0G; zgRootHash is the permanent content ref.
contract LoreRichComic is ERC721, AccessControl {

    // ─────────────────────────────────────────────────────────
    // Types
    // ─────────────────────────────────────────────────────────

    struct ComicMeta {
        address   creator;
        address[] collaborators;
        string    zgRootHash;   // 0G blob of full LoreComic JSON
        uint256   mintedAt;
    }

    // ─────────────────────────────────────────────────────────
    // Storage
    // ─────────────────────────────────────────────────────────

    uint256 private _nextTokenId;

    mapping(uint256 => ComicMeta) public comics;
    mapping(uint256 => string)    private _tokenURIs;

    // ─────────────────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────────────────

    event ComicMinted(
        uint256 indexed comicId,
        address indexed creator,
        string          zgRootHash
    );

    // ─────────────────────────────────────────────────────────
    // Constructor
    // ─────────────────────────────────────────────────────────

    constructor() ERC721("LoreRich Comic", "LRCOMIC") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    // ─────────────────────────────────────────────────────────
    // Mint
    // ─────────────────────────────────────────────────────────

    /// @notice Mint a new comic NFT to `to`.
    /// @param  to            Recipient (usually msg.sender).
    /// @param  zgRootHash    0G content root hash of the LoreComic JSON blob.
    /// @param  uri           Token metadata URI (IPFS / arweave / data URI).
    /// @param  collaborators Co-creator wallet addresses (may be empty).
    /// @return comicId       The newly minted token ID.
    function mint(
        address          to,
        string  calldata zgRootHash,
        string  calldata uri,
        address[] calldata collaborators
    ) external returns (uint256 comicId) {
        require(bytes(zgRootHash).length > 0, "LoreRichComic: empty rootHash");
        require(bytes(uri).length > 0,        "LoreRichComic: empty URI");

        comicId = _nextTokenId++;
        _safeMint(to, comicId);

        _tokenURIs[comicId] = uri;
        comics[comicId] = ComicMeta({
            creator:       msg.sender,
            collaborators: collaborators,
            zgRootHash:    zgRootHash,
            mintedAt:      block.timestamp
        });

        emit ComicMinted(comicId, msg.sender, zgRootHash);
    }

    // ─────────────────────────────────────────────────────────
    // Views
    // ─────────────────────────────────────────────────────────

    function tokenURI(uint256 tokenId)
        public
        view
        override
        returns (string memory)
    {
        _requireOwned(tokenId);
        return _tokenURIs[tokenId];
    }

    function totalComics() external view returns (uint256) {
        return _nextTokenId;
    }

    // ─────────────────────────────────────────────────────────
    // ERC165 override (ERC721 + AccessControl)
    // ─────────────────────────────────────────────────────────

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
