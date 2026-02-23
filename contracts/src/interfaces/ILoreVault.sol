// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title ILoreVault
/// @notice Read-only interface used by LoreIPModule to verify story ownership.
///         Only exposes the fields needed — no modification surface.
interface ILoreVault {
    function stories(uint256 storyId)
        external
        view
        returns (
            address uploader,
            uint256 vaultId,
            string  memory zgRootHash,
            string  memory mediaType,
            uint256 duration,
            bool    isPrivate,
            uint256 timestamp,
            string  memory title,
            string  memory encryptedKeyHash
        );
}
