// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {LoreIPModule} from "../src/LoreIPModule.sol";
import {ILoreVault} from "../src/interfaces/ILoreVault.sol";

/// @dev Minimal mock that lets tests control which address is the uploader
contract MockLoreVault {
    mapping(uint256 => address) public uploaders;

    function setUploader(uint256 storyId, address uploader) external {
        uploaders[storyId] = uploader;
    }

    function stories(uint256 storyId)
        external view
        returns (
            address uploader, uint256 vaultId, string memory zgRootHash,
            string  memory mediaType, uint256 duration, bool isPrivate,
            uint256 timestamp, string memory title, string memory encryptedKeyHash
        )
    {
        return (uploaders[storyId], 0, "", "text", 0, false, 0, "Mock Story", "");
    }
}

contract LoreIPModuleTest is Test {
    LoreIPModule public module;
    MockLoreVault public vault;

    address uploader  = makeAddr("uploader");
    address licensee  = makeAddr("licensee");
    address fee       = makeAddr("feeRecipient");
    address stranger  = makeAddr("stranger");

    uint256 constant STORY_ID    = 0;
    uint256 constant ROYALTY_WEI = 0.01 ether;

    function setUp() public {
        vault  = new MockLoreVault();
        module = new LoreIPModule(address(vault), fee);
        vault.setUploader(STORY_ID, uploader);
        vm.deal(licensee, 10 ether);
        vm.deal(uploader, 1 ether);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    function _setBasicTerms() internal {
        vm.prank(uploader);
        module.setTerms(
            STORY_ID, true, true, true,
            ROYALTY_WEI, ROYALTY_WEI * 3,
            0, "Worldwide"
        );
    }

    function _requestPersonal() internal returns (uint256 reqId) {
        vm.prank(licensee);
        reqId = module.requestLicense{value: ROYALTY_WEI}(
            STORY_ID, LoreIPModule.LicenseType.PERSONAL, "For family archive"
        );
    }

    // ── setTerms ──────────────────────────────────────────────────────────────

    function testSetTerms_onlyUploader() public {
        vm.prank(stranger);
        vm.expectRevert(
            abi.encodeWithSelector(LoreIPModule.NotStoryUploader.selector, STORY_ID, stranger)
        );
        module.setTerms(STORY_ID, true, false, false, 0, 0, 0, "");
    }

    function testSetTerms_storesCorrectly() public {
        _setBasicTerms();
        (bool lic, bool comm, bool excl, uint256 roy,,,, ) = module.terms(STORY_ID);
        assertTrue(lic);
        assertTrue(comm);
        assertTrue(excl);
        assertEq(roy, ROYALTY_WEI);
    }

    function testSetTerms_lockedAfterApproval() public {
        _setBasicTerms();
        uint256 reqId = _requestPersonal();
        vm.prank(uploader);
        module.approveRequest(reqId, 0);

        vm.prank(uploader);
        vm.expectRevert(
            abi.encodeWithSelector(LoreIPModule.TermsLockedAfterApproval.selector, STORY_ID)
        );
        module.setTerms(STORY_ID, false, false, false, 0, 0, 0, "");
    }

    function testSetTerms_jurisdictionTooLong() public {
        string memory longNote = new string(201);
        vm.prank(uploader);
        vm.expectRevert(LoreIPModule.JurisdictionNoteTooLong.selector);
        module.setTerms(STORY_ID, true, false, false, 0, 0, 0, longNote);
    }

    // ── requestLicense ────────────────────────────────────────────────────────

    function testRequestLicense_success() public {
        _setBasicTerms();
        uint256 before = address(module).balance;
        uint256 reqId  = _requestPersonal();
        assertEq(address(module).balance, before + ROYALTY_WEI);

        (uint256 sid, address lic,,
         LoreIPModule.LicenseStatus status,,,,, uint256 paid)
            = module.requests(reqId);
        assertEq(sid, STORY_ID);
        assertEq(lic, licensee);
        assertEq(uint8(status), uint8(LoreIPModule.LicenseStatus.PENDING));
        assertEq(paid, ROYALTY_WEI);
    }

    function testRequestLicense_notLicensable() public {
        // terms never set → isLicensable defaults false
        vm.prank(licensee);
        vm.expectRevert(
            abi.encodeWithSelector(LoreIPModule.StoryNotLicensable.selector, STORY_ID)
        );
        module.requestLicense{value: 0}(STORY_ID, LoreIPModule.LicenseType.PERSONAL, "");
    }

    function testRequestLicense_wrongPayment() public {
        _setBasicTerms();
        vm.prank(licensee);
        vm.expectRevert(
            abi.encodeWithSelector(LoreIPModule.InsufficientPayment.selector, ROYALTY_WEI, ROYALTY_WEI - 1)
        );
        module.requestLicense{value: ROYALTY_WEI - 1}(
            STORY_ID, LoreIPModule.LicenseType.PERSONAL, ""
        );
    }

    function testRequestLicense_commercialBlocked() public {
        vm.prank(uploader);
        module.setTerms(STORY_ID, true, false, false, ROYALTY_WEI, 0, 0, "");
        vm.prank(licensee);
        vm.expectRevert(
            abi.encodeWithSelector(LoreIPModule.CommercialNotAllowed.selector, STORY_ID)
        );
        module.requestLicense{value: ROYALTY_WEI}(
            STORY_ID, LoreIPModule.LicenseType.COMMERCIAL, ""
        );
    }

    function testRequestLicense_duplicateBlocked() public {
        _setBasicTerms();
        _requestPersonal();
        // First request sets pending; approve it so _hasActiveLicense is true
        vm.prank(uploader);
        module.approveRequest(0, 0);

        vm.prank(licensee);
        vm.expectRevert(
            abi.encodeWithSelector(LoreIPModule.AlreadyHasActiveLicense.selector, STORY_ID, licensee)
        );
        module.requestLicense{value: ROYALTY_WEI}(
            STORY_ID, LoreIPModule.LicenseType.PERSONAL, ""
        );
    }

    // ── approveRequest ────────────────────────────────────────────────────────

    function testApprove_splitsPayment() public {
        _setBasicTerms();
        uint256 reqId = _requestPersonal();

        vm.prank(uploader);
        module.approveRequest(reqId, 0);

        uint256 platformCut = (ROYALTY_WEI * 250) / 10_000;
        uint256 uploaderCut = ROYALTY_WEI - platformCut;
        assertEq(module.pendingWithdrawal(uploader), uploaderCut);
        assertEq(module.pendingWithdrawal(fee),      platformCut);
    }

    function testApprove_setsActiveLicense() public {
        _setBasicTerms();
        uint256 reqId = _requestPersonal();
        vm.prank(uploader);
        module.approveRequest(reqId, 0);
        assertTrue(module.hasActiveLicense(STORY_ID, licensee));
    }

    function testApprove_onlyUploader() public {
        _setBasicTerms();
        uint256 reqId = _requestPersonal();
        vm.prank(stranger);
        vm.expectRevert(
            abi.encodeWithSelector(LoreIPModule.NotRequestUploader.selector, reqId, stranger)
        );
        module.approveRequest(reqId, 0);
    }

    function testApprove_notPendingReverts() public {
        _setBasicTerms();
        uint256 reqId = _requestPersonal();
        vm.prank(uploader);
        module.approveRequest(reqId, 0);
        vm.prank(uploader);
        vm.expectRevert(
            abi.encodeWithSelector(LoreIPModule.RequestNotPending.selector, reqId)
        );
        module.approveRequest(reqId, 0);
    }

    // ── rejectRequest ─────────────────────────────────────────────────────────

    function testReject_refundsLicensee() public {
        _setBasicTerms();
        uint256 reqId = _requestPersonal();
        vm.prank(uploader);
        module.rejectRequest(reqId);
        assertEq(module.pendingWithdrawal(licensee), ROYALTY_WEI);
    }

    // ── withdraw ──────────────────────────────────────────────────────────────

    function testWithdraw_uploaderReceivesFunds() public {
        _setBasicTerms();
        uint256 reqId = _requestPersonal();
        vm.prank(uploader);
        module.approveRequest(reqId, 0);

        uint256 uploaderCut = ROYALTY_WEI - (ROYALTY_WEI * 250) / 10_000;
        uint256 before = uploader.balance;
        vm.prank(uploader);
        module.withdraw();
        assertEq(uploader.balance, before + uploaderCut);
        assertEq(module.pendingWithdrawal(uploader), 0);
    }

    function testWithdraw_nothingReverts() public {
        vm.prank(stranger);
        vm.expectRevert(LoreIPModule.NothingToWithdraw.selector);
        module.withdraw();
    }

    // ── Exclusive license ─────────────────────────────────────────────────────

    function testExclusive_locksStoryAfterApproval() public {
        _setBasicTerms();
        uint256 exclusivePrice = ROYALTY_WEI * 3;
        vm.prank(licensee);
        uint256 reqId = module.requestLicense{value: exclusivePrice}(
            STORY_ID, LoreIPModule.LicenseType.EXCLUSIVE, "Full exclusive"
        );
        vm.prank(uploader);
        module.approveRequest(reqId, 0);

        (bool lic,, bool excl,,,,, ) = module.terms(STORY_ID);
        assertFalse(lic);
        assertFalse(excl);
    }

    function testExclusive_revoke_unlocksStory() public {
        _setBasicTerms();
        uint256 exclusivePrice = ROYALTY_WEI * 3;
        vm.prank(licensee);
        uint256 reqId = module.requestLicense{value: exclusivePrice}(
            STORY_ID, LoreIPModule.LicenseType.EXCLUSIVE, "Full exclusive"
        );
        vm.prank(uploader);
        module.approveRequest(reqId, 0);
        vm.prank(uploader);
        module.revokeRequest(reqId);

        (bool lic,, bool excl,,,,, ) = module.terms(STORY_ID);
        assertTrue(lic);
        assertTrue(excl);
    }

    // ── getLicensableFlags ────────────────────────────────────────────────────

    function testGetLicensableFlags() public {
        vault.setUploader(1, uploader);
        _setBasicTerms(); // story 0: licensable
        // story 1: no terms set → not licensable

        uint256[] memory ids = new uint256[](2);
        ids[0] = 0; ids[1] = 1;
        bool[] memory flags = module.getLicensableFlags(ids);
        assertTrue(flags[0]);
        assertFalse(flags[1]);
    }
}
