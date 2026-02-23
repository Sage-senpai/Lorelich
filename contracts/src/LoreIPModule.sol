// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {ILoreVault} from "./interfaces/ILoreVault.sol";

/// @title LoreIPModule
/// @notice Programmable IP licensing for ancestral stories on LoreVault.
///         Story uploaders set license terms; licensees pay for licenses;
///         royalties flow via pull-withdrawal (CEI pattern throughout).
/// @dev    Reads ownership from ILoreVault — never mutates LoreVault state.
contract LoreIPModule is ReentrancyGuard {

    // ─────────────────────────────────────────────────────────────────────────
    // Types
    // ─────────────────────────────────────────────────────────────────────────

    enum LicenseType   { PERSONAL, DOCUMENTARY, COMMERCIAL, EXCLUSIVE }
    enum LicenseStatus { PENDING, APPROVED, REJECTED, REVOKED }

    struct LicenseTerms {
        bool    isLicensable;
        bool    commercialUse;
        bool    exclusiveAvailable;
        uint256 royaltyWei;            // per-license fee in native OG token
        uint256 exclusiveRoyaltyWei;   // fee for exclusive license
        uint256 maxLicenses;           // 0 = unlimited
        string  jurisdictionNote;      // off-chain reference only, max 200 chars
        uint256 setAt;
    }

    struct LicenseRequest {
        uint256       storyId;
        address       licensee;
        LicenseType   licenseType;
        LicenseStatus status;
        uint256       requestedAt;
        uint256       respondedAt;
        uint256       expiresAt;   // 0 = perpetual; set by uploader on approval
        string        purposeNote; // max 500 chars
        uint256       amountPaid;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Storage
    // ─────────────────────────────────────────────────────────────────────────

    ILoreVault public immutable loreVault;
    address    public immutable feeRecipient;
    uint256    public constant  PLATFORM_FEE_BPS = 250; // 2.5%

    mapping(uint256 => LicenseTerms)                     public  terms;
    mapping(uint256 => LicenseRequest)                   public  requests;
    mapping(uint256 => uint256[])                        private _storyRequests;
    mapping(uint256 => uint256)                          private _approvedCount;
    mapping(uint256 => mapping(address => bool))         private _hasActiveLicense;
    mapping(address => uint256)                          private _pendingWithdrawals;
    uint256 private _nextRequestId;

    // ─────────────────────────────────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────────────────────────────────

    event TermsSet(uint256 indexed storyId, address indexed uploader, bool isLicensable, bool commercialUse, uint256 royaltyWei);
    event LicenseRequested(uint256 indexed requestId, uint256 indexed storyId, address indexed licensee, LicenseType licenseType);
    event LicenseApproved(uint256 indexed requestId, uint256 indexed storyId, address indexed licensee, uint256 expiresAt, uint256 amountPaid);
    event LicenseRejected(uint256 indexed requestId, uint256 indexed storyId, address indexed licensee);
    event LicenseRevoked(uint256 indexed requestId, uint256 indexed storyId, address indexed uploader);
    event RoyaltyWithdrawn(address indexed account, uint256 amount);

    // ─────────────────────────────────────────────────────────────────────────
    // Errors
    // ─────────────────────────────────────────────────────────────────────────

    error NotStoryUploader(uint256 storyId, address caller);
    error StoryNotLicensable(uint256 storyId);
    error CommercialNotAllowed(uint256 storyId);
    error ExclusiveNotAvailable(uint256 storyId);
    error AlreadyHasActiveLicense(uint256 storyId, address licensee);
    error MaxLicensesReached(uint256 storyId);
    error InsufficientPayment(uint256 required, uint256 sent);
    error TermsLockedAfterApproval(uint256 storyId);
    error RequestNotPending(uint256 requestId);
    error NotRequestUploader(uint256 requestId, address caller);
    error NothingToWithdraw();
    error PurposeNoteTooLong();
    error JurisdictionNoteTooLong();
    error TransferFailed();

    // ─────────────────────────────────────────────────────────────────────────
    // Modifier
    // ─────────────────────────────────────────────────────────────────────────

    modifier onlyStoryUploader(uint256 storyId) {
        (address uploader,,,,,,,, ) = loreVault.stories(storyId);
        if (uploader != msg.sender) revert NotStoryUploader(storyId, msg.sender);
        _;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Constructor
    // ─────────────────────────────────────────────────────────────────────────

    constructor(address _loreVault, address _feeRecipient) {
        loreVault    = ILoreVault(_loreVault);
        feeRecipient = _feeRecipient;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Uploader: Set Terms
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Set or update license terms for a story you uploaded.
    ///         Terms are locked once any license has been approved.
    function setTerms(
        uint256 storyId,
        bool    isLicensable,
        bool    commercialUse,
        bool    exclusiveAvailable,
        uint256 royaltyWei,
        uint256 exclusiveRoyaltyWei,
        uint256 maxLicenses,
        string  calldata jurisdictionNote
    ) external onlyStoryUploader(storyId) {
        if (bytes(jurisdictionNote).length > 200) revert JurisdictionNoteTooLong();
        if (_approvedCount[storyId] > 0) revert TermsLockedAfterApproval(storyId);

        terms[storyId] = LicenseTerms({
            isLicensable:        isLicensable,
            commercialUse:       commercialUse,
            exclusiveAvailable:  exclusiveAvailable,
            royaltyWei:          royaltyWei,
            exclusiveRoyaltyWei: exclusiveRoyaltyWei,
            maxLicenses:         maxLicenses,
            jurisdictionNote:    jurisdictionNote,
            setAt:               block.timestamp
        });

        emit TermsSet(storyId, msg.sender, isLicensable, commercialUse, royaltyWei);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Licensee: Request License
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Submit a license request and pay the royalty upfront.
    ///         Payment is held in escrow until approved or rejected.
    function requestLicense(
        uint256     storyId,
        LicenseType licenseType,
        string      calldata purposeNote
    ) external payable nonReentrant returns (uint256 requestId) {
        if (bytes(purposeNote).length > 500) revert PurposeNoteTooLong();

        LicenseTerms storage t = terms[storyId];
        if (!t.isLicensable) revert StoryNotLicensable(storyId);

        if (licenseType == LicenseType.COMMERCIAL || licenseType == LicenseType.EXCLUSIVE) {
            if (!t.commercialUse) revert CommercialNotAllowed(storyId);
        }
        if (licenseType == LicenseType.EXCLUSIVE) {
            if (!t.exclusiveAvailable) revert ExclusiveNotAvailable(storyId);
        }
        if (_hasActiveLicense[storyId][msg.sender]) {
            revert AlreadyHasActiveLicense(storyId, msg.sender);
        }
        if (t.maxLicenses > 0 && _approvedCount[storyId] >= t.maxLicenses) {
            revert MaxLicensesReached(storyId);
        }

        uint256 required = licenseType == LicenseType.EXCLUSIVE
            ? t.exclusiveRoyaltyWei
            : t.royaltyWei;
        if (msg.value != required) revert InsufficientPayment(required, msg.value);

        requestId = _nextRequestId++;
        requests[requestId] = LicenseRequest({
            storyId:     storyId,
            licensee:    msg.sender,
            licenseType: licenseType,
            status:      LicenseStatus.PENDING,
            requestedAt: block.timestamp,
            respondedAt: 0,
            expiresAt:   0,
            purposeNote: purposeNote,
            amountPaid:  msg.value
        });
        _storyRequests[storyId].push(requestId);

        emit LicenseRequested(requestId, storyId, msg.sender, licenseType);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Uploader: Approve / Reject / Revoke
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Approve a pending request. Splits payment to uploader + platform via pull.
    /// @param expirySeconds Seconds from now until license expires. 0 = perpetual.
    function approveRequest(uint256 requestId, uint256 expirySeconds)
        external nonReentrant
    {
        LicenseRequest storage req = requests[requestId];
        if (req.status != LicenseStatus.PENDING) revert RequestNotPending(requestId);

        (address uploader,,,,,,,, ) = loreVault.stories(req.storyId);
        if (uploader != msg.sender) revert NotRequestUploader(requestId, msg.sender);

        // Effects
        req.status      = LicenseStatus.APPROVED;
        req.respondedAt = block.timestamp;
        req.expiresAt   = expirySeconds > 0 ? block.timestamp + expirySeconds : 0;

        _hasActiveLicense[req.storyId][req.licensee] = true;
        _approvedCount[req.storyId]++;

        if (req.licenseType == LicenseType.EXCLUSIVE) {
            terms[req.storyId].isLicensable      = false;
            terms[req.storyId].exclusiveAvailable = false;
        }

        // Interactions: pull-pattern split
        uint256 paid        = req.amountPaid;
        uint256 platformCut = (paid * PLATFORM_FEE_BPS) / 10_000;
        uint256 uploaderCut = paid - platformCut;
        _pendingWithdrawals[uploader]     += uploaderCut;
        _pendingWithdrawals[feeRecipient] += platformCut;

        emit LicenseApproved(requestId, req.storyId, req.licensee, req.expiresAt, paid);
    }

    /// @notice Reject a pending request. Refund goes to licensee via pull.
    function rejectRequest(uint256 requestId) external nonReentrant {
        LicenseRequest storage req = requests[requestId];
        if (req.status != LicenseStatus.PENDING) revert RequestNotPending(requestId);

        (address uploader,,,,,,,, ) = loreVault.stories(req.storyId);
        if (uploader != msg.sender) revert NotRequestUploader(requestId, msg.sender);

        req.status      = LicenseStatus.REJECTED;
        req.respondedAt = block.timestamp;
        _pendingWithdrawals[req.licensee] += req.amountPaid;

        emit LicenseRejected(requestId, req.storyId, req.licensee);
    }

    /// @notice Revoke an approved license. No refund — use expiry for time-limited deals.
    function revokeRequest(uint256 requestId) external nonReentrant {
        LicenseRequest storage req = requests[requestId];
        if (req.status != LicenseStatus.APPROVED) revert RequestNotPending(requestId);

        (address uploader,,,,,,,, ) = loreVault.stories(req.storyId);
        if (uploader != msg.sender) revert NotRequestUploader(requestId, msg.sender);

        req.status      = LicenseStatus.REVOKED;
        req.respondedAt = block.timestamp;
        _hasActiveLicense[req.storyId][req.licensee] = false;

        if (req.licenseType == LicenseType.EXCLUSIVE) {
            terms[req.storyId].isLicensable      = true;
            terms[req.storyId].exclusiveAvailable = true;
        }

        emit LicenseRevoked(requestId, req.storyId, uploader);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Pull Withdrawal
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Withdraw accumulated royalties (uploader) or refunds (rejected licensee).
    function withdraw() external nonReentrant {
        uint256 amount = _pendingWithdrawals[msg.sender];
        if (amount == 0) revert NothingToWithdraw();

        _pendingWithdrawals[msg.sender] = 0; // CEI: zero before transfer
        (bool ok,) = payable(msg.sender).call{value: amount}("");
        if (!ok) revert TransferFailed();

        emit RoyaltyWithdrawn(msg.sender, amount);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // View Functions
    // ─────────────────────────────────────────────────────────────────────────

    function getStoryRequests(uint256 storyId)
        external view returns (uint256[] memory)
    {
        return _storyRequests[storyId];
    }

    function hasActiveLicense(uint256 storyId, address licensee)
        external view returns (bool)
    {
        return _hasActiveLicense[storyId][licensee];
    }

    function pendingWithdrawal(address account)
        external view returns (uint256)
    {
        return _pendingWithdrawals[account];
    }

    /// @notice Batch-check which storyIds have isLicensable = true.
    ///         Useful for frontend marketplace filtering without N separate calls.
    function getLicensableFlags(uint256[] calldata storyIds)
        external view returns (bool[] memory flags)
    {
        flags = new bool[](storyIds.length);
        for (uint256 i = 0; i < storyIds.length; i++) {
            flags[i] = terms[storyIds[i]].isLicensable;
        }
    }
}
