// SPDX-License-Identifier: CC0-1.0
pragma solidity ^0.8.24;

/// @title ERC5192 — Minimal Soulbound NFTs
/// @notice Every token is permanently locked (non-transferable).
interface IERC5192 {
    /// @notice Emitted when the locking status changes. Always emitted at mint with `locked = true`.
    event Locked(uint256 tokenId);

    /// @notice Emitted if a token is ever unlocked (not used in LoreLich V1).
    event Unlocked(uint256 tokenId);

    /// @notice Returns the locking status of an EIP-5192 token.
    /// @dev Tokens created under ERC5192 MUST be locked at mint.
    /// @param tokenId The identifier for a token.
    /// @return locked Whether the token is locked.
    function locked(uint256 tokenId) external view returns (bool);
}
