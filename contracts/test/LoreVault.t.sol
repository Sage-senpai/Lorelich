// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {LoreVault} from "../src/LoreVault.sol";
import {SoulboundStory} from "../src/SoulboundStory.sol";

contract LoreVaultTest is Test {
    LoreVault      internal vault;
    SoulboundStory internal soul;

    address internal owner = address(0xA1);
    address internal alice = address(0xA2);
    address internal bob   = address(0xB1);

    function setUp() public {
        soul  = new SoulboundStory();
        vault = new LoreVault(address(soul));
        soul.grantMinterRole(address(vault));
    }

    // ─── helpers ─────────────────────────────────────────────

    function _params(
        uint256 vaultId,
        string memory rootHash,
        string memory title
    ) internal pure returns (LoreVault.UploadParams memory) {
        return LoreVault.UploadParams({
            vaultId:          vaultId,
            zgRootHash:       rootHash,
            title:            title,
            mediaType:        "audio",
            duration:         60,
            encryptedKeyHash: "",
            tokenURI:         "ipfs://QmTest"
        });
    }

    // ─────────────────────────────────────────────────────────
    // Vault Creation
    // ─────────────────────────────────────────────────────────

    function test_createVault() public {
        vm.prank(owner);
        uint256 vaultId = vault.createVault("Okafor Family", false);

        (address vOwner, string memory name, bool isPrivate,,) = vault.vaults(vaultId);
        assertEq(vOwner, owner);
        assertEq(name, "Okafor Family");
        assertFalse(isPrivate);
    }

    function test_createPrivateVault() public {
        vm.prank(alice);
        uint256 vaultId = vault.createVault("Private Memories", true);

        (,, bool isPrivate,,) = vault.vaults(vaultId);
        assertTrue(isPrivate);
    }

    function test_revert_createVault_emptyName() public {
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(LoreVault.EmptyString.selector, "name"));
        vault.createVault("", false);
    }

    // ─────────────────────────────────────────────────────────
    // Story Upload
    // ─────────────────────────────────────────────────────────

    function test_uploadStory() public {
        vm.startPrank(owner);
        uint256 vaultId = vault.createVault("Test Vault", false);

        uint256 storyId = vault.uploadStory(LoreVault.UploadParams({
            vaultId:          vaultId,
            zgRootHash:       "0xabc123rootHash",
            title:            "Grandma's Story",
            mediaType:        "audio",
            duration:         180,
            encryptedKeyHash: "",
            tokenURI:         "ipfs://QmTest"
        }));
        vm.stopPrank();

        (address uploader, uint256 vid, string memory zgHash,,,,, string memory title,) =
            vault.stories(storyId);
        assertEq(uploader, owner);
        assertEq(vid, vaultId);
        assertEq(zgHash, "0xabc123rootHash");
        assertEq(title, "Grandma's Story");
    }

    function test_uploadStory_mintsSoulbound() public {
        vm.startPrank(owner);
        uint256 vaultId = vault.createVault("Test Vault", false);
        uint256 storyId = vault.uploadStory(_params(vaultId, "0xhash", "Story"));
        vm.stopPrank();

        assertEq(soul.ownerOf(0), owner);
        assertEq(soul.tokenToStory(0), storyId);
    }

    function test_revert_uploadStory_notOwner() public {
        vm.prank(owner);
        uint256 vaultId = vault.createVault("Test Vault", false);

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(LoreVault.NotVaultOwner.selector, vaultId, alice));
        vault.uploadStory(_params(vaultId, "0xhash", "Story"));
    }

    function test_revert_uploadStory_emptyRootHash() public {
        vm.startPrank(owner);
        uint256 vaultId = vault.createVault("Test Vault", false);
        vm.expectRevert(abi.encodeWithSelector(LoreVault.EmptyString.selector, "zgRootHash"));
        vault.uploadStory(_params(vaultId, "", "Story"));
        vm.stopPrank();
    }

    function test_revert_uploadStory_emptyTitle() public {
        vm.startPrank(owner);
        uint256 vaultId = vault.createVault("Test Vault", false);
        vm.expectRevert(abi.encodeWithSelector(LoreVault.EmptyString.selector, "title"));
        vault.uploadStory(_params(vaultId, "0xhash", ""));
        vm.stopPrank();
    }

    // ─────────────────────────────────────────────────────────
    // Access Control
    // ─────────────────────────────────────────────────────────

    function test_grantAndRevokeAccess() public {
        vm.startPrank(owner);
        uint256 vaultId = vault.createVault("Private", true);
        vault.grantAccess(vaultId, alice);
        vm.stopPrank();

        assertTrue(vault.hasAccess(vaultId, alice));
        assertFalse(vault.hasAccess(vaultId, bob));

        vm.prank(owner);
        vault.revokeAccess(vaultId, alice);
        assertFalse(vault.hasAccess(vaultId, alice));
    }

    function test_revert_getVaultStories_privateNoAccess() public {
        vm.prank(owner);
        uint256 vaultId = vault.createVault("Private", true);

        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSelector(LoreVault.AccessDenied.selector, vaultId, bob));
        vault.getVaultStories(vaultId);
    }

    function test_publicVault_anyoneCanRead() public {
        vm.prank(owner);
        uint256 vaultId = vault.createVault("Public", false);

        assertTrue(vault.hasAccess(vaultId, bob));
        vm.prank(bob);
        vault.getVaultStories(vaultId); // should not revert
    }

    function test_revert_cannotTransferSoulbound() public {
        vm.startPrank(owner);
        uint256 vaultId = vault.createVault("Test", false);
        vault.uploadStory(_params(vaultId, "0xhash", "Story"));
        vm.stopPrank();

        vm.prank(owner);
        vm.expectRevert("SoulboundStory: non-transferable");
        soul.transferFrom(owner, alice, 0);
    }

    // ─────────────────────────────────────────────────────────
    // Counters
    // ─────────────────────────────────────────────────────────

    function test_totalCounters() public {
        assertEq(vault.totalVaults(), 0);
        assertEq(vault.totalStories(), 0);

        vm.startPrank(owner);
        uint256 vaultId = vault.createVault("Vault", false);
        vault.uploadStory(_params(vaultId, "0xhash1", "S1"));
        vault.uploadStory(_params(vaultId, "0xhash2", "S2"));
        vm.stopPrank();

        assertEq(vault.totalVaults(), 1);
        assertEq(vault.totalStories(), 2);
    }
}
