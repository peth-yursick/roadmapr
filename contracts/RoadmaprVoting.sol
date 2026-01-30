// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title RoadmaprVoting - V1 with Immediate Claiming & Global Platform Fee
 * @notice Token voting contract ready for future upgrades
 *
 * V1 FEATURES:
 * 1. Immediate claiming - owners can claim as soon as feature is "shipped"
 * 2. Flexible voter withdrawal - voters can withdraw before owner claims
 * 3. Global platform fee - 1% goes to platform owner (you)
 * 4. Migration support - ready for future upgrades to verification system
 *
 * FLOW:
 * 1. Users vote by locking tokens (1% fee collected for platform)
 * 2. Voters can withdraw anytime BEFORE owner claims
 * 3. Owner marks feature "shipped" → can claim immediately
 * 4. After owner claims, voters cannot withdraw
 *
 * FUTURE UPGRADES (via migration):
 * - Add community verification period
 * - Add dispute mechanism
 * - Add delayed claiming
 *
 * MIGRATION:
 * - Contract supports migrating to future versions
 * - State preserved during migration
 */
contract RoadmaprVoting is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // ============================================
    // Version & Migration
    // ============================================

    uint256 public constant VERSION = 1;
    address public migrationContract;

    // Global platform fee recipient (you!)
    address public platformFeeRecipient;

    // ============================================
    // Constants
    // ============================================

    uint256 public constant FEE_PERCENTAGE = 100; // 1% = 100 basis points
    uint256 public constant FEE_DENOMINATOR = 10000;

    // ============================================
    // Enums
    // ============================================

    enum FeatureStatus {
        Open,       // 0: Open for voting
        Shipped,    // 1: Shipped, owner can claim
        Claimed,    // 2: Tokens claimed by owner
        Migrated    // 3: Migrated to new contract
    }

    // ============================================
    // Structs
    // ============================================

    struct Project {
        address tokenAddress;
        address owner;
        uint256 voteIncrement;
        uint256 totalFeesCollected;
        uint256 totalUpvotes;
        uint256 totalDownvotes;
        bool exists;
    }

    struct Vote {
        address voter;
        uint256 tokensLocked;
        uint256 feePaid;
        uint256 lockedAt;
        bool isUpvote;
        bool withdrawn;
        bool claimedByOwner;
    }

    struct Feature {
        bytes32 projectId;
        uint256 totalUpvoteTokens;
        uint256 totalDownvoteTokens;
        uint256 shippedAt;
        FeatureStatus status;
    }

    struct ProjectVote {
        address voter;
        uint256 voteAmount;
        uint256 feePaid;
        bool isUpvote;
        uint256 votedAt;
    }

    // ============================================
    // State
    // ============================================

    mapping(bytes32 => Project) public projects;
    mapping(bytes32 => Feature) public features;
    mapping(bytes32 => mapping(address => Vote)) public votes;
    mapping(bytes32 => uint256) public accumulatedFees;
    mapping(bytes32 => bool) public isMigrated;

    // Project-level voting (for main page upvotes/downvotes)
    mapping(bytes32 => mapping(address => ProjectVote)) public projectVotes;

    // ============================================
    // Events
    // ============================================

    event ProjectRegistered(
        bytes32 indexed projectId,
        address indexed tokenAddress,
        address indexed owner,
        uint256 voteIncrement
    );

    event VoteCast(
        bytes32 indexed featureId,
        bytes32 indexed projectId,
        address indexed voter,
        uint256 tokensLocked,
        uint256 feePaid,
        bool isUpvote
    );

    event ProjectVoted(
        bytes32 indexed projectId,
        address indexed voter,
        uint256 voteAmount,
        uint256 feePaid,
        bool isUpvote
    );

    event VoteWithdrawn(
        bytes32 indexed featureId,
        address indexed voter,
        uint256 tokensReturned
    );

    event FeatureShipped(
        bytes32 indexed featureId,
        bytes32 indexed projectId,
        uint256 shippedAt
    );

    event TokensClaimed(
        bytes32 indexed featureId,
        bytes32 indexed projectId,
        address indexed claimer,
        uint256 amount
    );

    event PlatformFeesWithdrawn(
        bytes32 indexed projectId,
        address indexed recipient,
        uint256 amount
    );

    event MigrationContractSet(address indexed oldContract, address indexed newContract);

    event FeatureMigrated(
        bytes32 indexed featureId,
        address indexed newContract,
        uint256 votersMigrated
    );

    event PlatformFeeRecipientUpdated(address indexed oldRecipient, address indexed newRecipient);

    // ============================================
    // Constructor
    // ============================================

    constructor() Ownable(msg.sender) {
        // Set platform fee recipient to hardcoded address
        platformFeeRecipient = 0xC9054316638bf93eF759fda66becEC54248eB4D9;
    }

    // ============================================
    // Platform Fee Management
    // ============================================

    /**
     * @notice Update global platform fee recipient (contract owner only)
     */
    function setPlatformFeeRecipient(address _platformFeeRecipient) external onlyOwner {
        require(_platformFeeRecipient != address(0), "Invalid address");
        address oldRecipient = platformFeeRecipient;
        platformFeeRecipient = _platformFeeRecipient;
        emit PlatformFeeRecipientUpdated(oldRecipient, _platformFeeRecipient);
    }

    // ============================================
    // Migration Functions
    // ============================================

    /**
     * @notice Set contract that features can be migrated to
     */
    function setMigrationContract(address _migrationContract) external onlyOwner {
        require(_migrationContract != address(0), "Invalid address");
        migrationContract = _migrationContract;
        emit MigrationContractSet(address(this), _migrationContract);
    }

    /**
     * @notice Migrate a feature to new contract version
     */
    function migrateFeature(bytes32 featureId, address[] calldata voters) external onlyOwner {
        require(migrationContract != address(0), "No migration contract set");
        require(!isMigrated[featureId], "Already migrated");

        Feature storage feature = features[featureId];
        require(feature.projectId != bytes32(0), "Feature does not exist");
        require(feature.status != FeatureStatus.Migrated, "Already migrated");

        // Mark as migrated
        feature.status = FeatureStatus.Migrated;
        isMigrated[featureId] = true;

        emit FeatureMigrated(featureId, migrationContract, voters.length);
    }

    // ============================================
    // Project Management
    // ============================================

    /**
     * @notice Register a new project for token voting
     */
    function registerProject(
        bytes32 projectId,
        address tokenAddress,
        uint256 voteIncrement
    ) external {
        require(!projects[projectId].exists, "Project already exists");
        require(tokenAddress != address(0), "Invalid token address");
        require(voteIncrement > 0, "Vote increment must be > 0");

        projects[projectId] = Project({
            tokenAddress: tokenAddress,
            owner: msg.sender,
            voteIncrement: voteIncrement,
            totalFeesCollected: 0,
            exists: true
        });

        emit ProjectRegistered(projectId, tokenAddress, msg.sender, voteIncrement);
    }

    /**
     * @notice Update project settings
     */
    function updateProject(
        bytes32 projectId,
        uint256 voteIncrement
    ) external {
        Project storage project = projects[projectId];
        require(project.exists, "Project does not exist");
        require(msg.sender == project.owner, "Not project owner");
        require(voteIncrement > 0, "Vote increment must be > 0");

        project.voteIncrement = voteIncrement;
    }

    /**
     * @notice Transfer project ownership
     */
    function transferProjectOwnership(bytes32 projectId, address newOwner) external {
        Project storage project = projects[projectId];
        require(project.exists, "Project does not exist");
        require(msg.sender == project.owner, "Not project owner");
        require(newOwner != address(0), "Invalid new owner");

        project.owner = newOwner;
    }

    // ============================================
    // Voting
    // ============================================

    /**
     * @notice Cast a vote by locking tokens
     */
    function vote(
        bytes32 featureId,
        bytes32 projectId,
        uint256 voteCount,
        bool isUpvote
    ) external nonReentrant {
        Project storage project = projects[projectId];
        require(project.exists, "Project does not exist");
        require(voteCount > 0, "Vote count must be > 0");

        Feature storage feature = features[featureId];
        require(
            feature.status == FeatureStatus.Open || feature.projectId == bytes32(0),
            "Feature not open for voting"
        );
        require(feature.status != FeatureStatus.Migrated, "Feature migrated");

        Vote storage existingVote = votes[featureId][msg.sender];
        require(existingVote.tokensLocked == 0, "Already voted on this feature");

        // Calculate amounts
        uint256 tokensToLock = voteCount * project.voteIncrement;
        uint256 fee = (tokensToLock * FEE_PERCENTAGE) / FEE_DENOMINATOR;
        uint256 totalRequired = tokensToLock + fee;

        // Transfer tokens from voter
        IERC20 token = IERC20(project.tokenAddress);
        token.safeTransferFrom(msg.sender, address(this), totalRequired);

        // Initialize feature if first vote
        if (feature.projectId == bytes32(0)) {
            feature.projectId = projectId;
            feature.status = FeatureStatus.Open;
        }

        // Record vote
        votes[featureId][msg.sender] = Vote({
            voter: msg.sender,
            tokensLocked: tokensToLock,
            feePaid: fee,
            lockedAt: block.timestamp,
            isUpvote: isUpvote,
            withdrawn: false,
            claimedByOwner: false
        });

        // Update feature totals
        if (isUpvote) {
            feature.totalUpvoteTokens += tokensToLock;
        } else {
            feature.totalDownvoteTokens += tokensToLock;
        }

        // Accumulate fees for platform
        accumulatedFees[projectId] += fee;
        project.totalFeesCollected += fee;

        emit VoteCast(featureId, projectId, msg.sender, tokensToLock, fee, isUpvote);
    }

    // ============================================
    // Project-Level Voting (Main Page)
    // ============================================

    /**
     * @notice Vote on a project directly (for main page ranking)
     * @dev 100% of vote amount goes to platform owner - score cancels but platform claims all
     * @param projectId Project ID (bytes32)
     * @param voteAmount Amount of tokens to vote with (using project's token)
     * @param isUpvote true for upvote, false for downvote
     */
    function voteProject(
        bytes32 projectId,
        uint256 voteAmount,
        bool isUpvote
    ) external nonReentrant {
        Project storage project = projects[projectId];
        require(project.exists, "Project does not exist");
        require(voteAmount > 0, "Vote amount must be > 0");
        require(platformFeeRecipient != address(0), "Platform fee recipient not set");

        // Check if user has already voted on this project
        ProjectVote storage existingVote = projectVotes[projectId][msg.sender];
        require(existingVote.voteAmount == 0, "Already voted on this project");

        // Transfer 100% of vote amount to platform fee recipient
        IERC20 token = IERC20(project.tokenAddress);
        token.safeTransferFrom(msg.sender, platformFeeRecipient, voteAmount);

        // Record vote
        projectVotes[projectId][msg.sender] = ProjectVote({
            voter: msg.sender,
            voteAmount: voteAmount,
            feePaid: voteAmount, // 100% is the fee
            isUpvote: isUpvote,
            votedAt: block.timestamp
        });

        // Update project totals (for score display)
        if (isUpvote) {
            project.totalUpvotes += voteAmount;
        } else {
            project.totalDownvotes += voteAmount;
        }

        // Track total fees collected (for transparency)
        accumulatedFees[projectId] += voteAmount;
        project.totalFeesCollected += voteAmount;

        emit ProjectVoted(projectId, msg.sender, voteAmount, voteAmount, isUpvote);
    }

    // ============================================
    // Vote Withdrawal - Flexible
    // ============================================

    /**
     * @notice Voters can withdraw anytime BEFORE owner claims
     */
    function withdrawVote(bytes32 featureId) external nonReentrant {
        Vote storage voteData = votes[featureId][msg.sender];
        require(voteData.tokensLocked > 0, "No vote to withdraw");
        require(!voteData.withdrawn, "Already withdrawn");
        require(!voteData.claimedByOwner, "Claimed by project owner");

        Feature storage feature = features[featureId];
        require(feature.status != FeatureStatus.Claimed, "Feature claimed - cannot withdraw");
        require(feature.status != FeatureStatus.Migrated, "Feature migrated - use new contract");

        uint256 tokensToReturn = voteData.tokensLocked;
        voteData.withdrawn = true;
        voteData.tokensLocked = 0;

        // Update feature totals
        if (voteData.isUpvote) {
            feature.totalUpvoteTokens -= tokensToReturn;
        } else {
            feature.totalDownvoteTokens -= tokensToReturn;
        }

        // Return tokens (no refund of fee)
        Project storage project = projects[feature.projectId];
        IERC20 token = IERC20(project.tokenAddress);
        token.safeTransfer(msg.sender, tokensToReturn);

        emit VoteWithdrawn(featureId, msg.sender, tokensToReturn);
    }

    // ============================================
    // Feature Shipping & Token Claiming
    // ============================================

    /**
     * @notice Mark a feature as shipped (project owner only)
     * @dev Once shipped, owner can claim tokens immediately
     */
    function markFeatureShipped(bytes32 featureId) external {
        Feature storage feature = features[featureId];
        require(feature.projectId != bytes32(0), "Feature does not exist");
        require(feature.status == FeatureStatus.Open, "Already shipped or claimed");

        Project storage project = projects[feature.projectId];
        require(msg.sender == project.owner, "Not project owner");

        feature.status = FeatureStatus.Shipped;
        feature.shippedAt = block.timestamp;

        emit FeatureShipped(featureId, feature.projectId, block.timestamp);
    }

    /**
     * @notice Claim locked tokens from a shipped feature (project owner only)
     */
    function claimTokens(
        bytes32 featureId,
        address[] calldata voters
    ) external nonReentrant {
        Feature storage feature = features[featureId];
        require(feature.status == FeatureStatus.Shipped, "Feature not shipped");

        Project storage project = projects[feature.projectId];
        require(msg.sender == project.owner, "Not project owner");

        uint256 totalToClaim = 0;
        IERC20 token = IERC20(project.tokenAddress);

        for (uint256 i = 0; i < voters.length; i++) {
            Vote storage voteData = votes[featureId][voters[i]];

            if (voteData.tokensLocked > 0 && !voteData.withdrawn && !voteData.claimedByOwner) {
                totalToClaim += voteData.tokensLocked;
                voteData.claimedByOwner = true;
            }
        }

        require(totalToClaim > 0, "Nothing to claim");

        feature.status = FeatureStatus.Claimed;
        token.safeTransfer(msg.sender, totalToClaim);

        emit TokensClaimed(featureId, feature.projectId, msg.sender, totalToClaim);
    }

    /**
     * @notice Batch claim from multiple features
     */
    function batchClaimTokens(
        bytes32[] calldata featureIds,
        address[][] calldata votersPerFeature
    ) external nonReentrant {
        require(featureIds.length == votersPerFeature.length, "Array length mismatch");

        for (uint256 i = 0; i < featureIds.length; i++) {
            Feature storage feature = features[featureIds[i]];
            if (feature.status != FeatureStatus.Shipped) continue;

            Project storage project = projects[feature.projectId];
            if (msg.sender != project.owner) continue;

            uint256 totalToClaim = 0;
            IERC20 token = IERC20(project.tokenAddress);

            for (uint256 j = 0; j < votersPerFeature[i].length; j++) {
                Vote storage voteData = votes[featureIds[i]][votersPerFeature[i][j]];

                if (voteData.tokensLocked > 0 && !voteData.withdrawn && !voteData.claimedByOwner) {
                    totalToClaim += voteData.tokensLocked;
                    voteData.claimedByOwner = true;
                }
            }

            if (totalToClaim > 0) {
                feature.status = FeatureStatus.Claimed;
                token.safeTransfer(msg.sender, totalToClaim);
                emit TokensClaimed(featureIds[i], feature.projectId, msg.sender, totalToClaim);
            }
        }
    }

    // ============================================
    // Platform Fee Withdrawal
    // ============================================

    /**
     * @notice Withdraw accumulated 1% platform fees (platform owner only)
     */
    function withdrawPlatformFees(bytes32 projectId) external nonReentrant {
        require(msg.sender == platformFeeRecipient, "Not platform fee recipient");

        Project storage project = projects[projectId];
        require(project.exists, "Project does not exist");

        uint256 fees = accumulatedFees[projectId];
        require(fees > 0, "No fees to withdraw");

        accumulatedFees[projectId] = 0;

        IERC20 token = IERC20(project.tokenAddress);
        token.safeTransfer(platformFeeRecipient, fees);

        emit PlatformFeesWithdrawn(projectId, platformFeeRecipient, fees);
    }

    // ============================================
    // View Functions
    // ============================================

    function getProject(bytes32 projectId) external view returns (Project memory) {
        return projects[projectId];
    }

    /**
     * @notice Get project score (upvotes - downvotes) for main page ranking
     */
    function getProjectScore(bytes32 projectId) external view returns (int256) {
        Project storage project = projects[projectId];
        if (!project.exists) return 0;

        // Return signed score (can be negative if more downvotes)
        return int256(project.totalUpvotes) - int256(project.totalDownvotes);
    }

    /**
     * @notice Get project vote details
     */
    function getProjectVotes(bytes32 projectId) external view returns (
        uint256 totalUpvotes,
        uint256 totalDownvotes,
        uint256 totalFeesCollected,
        int256 score
    ) {
        Project storage project = projects[projectId];
        if (!project.exists) {
            return (0, 0, 0, 0);
        }

        score = int256(project.totalUpvotes) - int256(project.totalDownvotes);
        return (
            project.totalUpvotes,
            project.totalDownvotes,
            project.totalFeesCollected,
            score
        );
    }

    function getFeature(bytes32 featureId) external view returns (Feature memory) {
        return features[featureId];
    }

    function getVote(bytes32 featureId, address voter) external view returns (Vote memory) {
        return votes[featureId][voter];
    }

    /**
     * @notice Check if voter can withdraw their vote
     */
    function canWithdraw(bytes32 featureId, address voter) external view returns (bool) {
        Vote storage voteData = votes[featureId][voter];
        Feature storage feature = features[featureId];

        return voteData.tokensLocked > 0 &&
               !voteData.withdrawn &&
               !voteData.claimedByOwner &&
               feature.status != FeatureStatus.Claimed &&
               feature.status != FeatureStatus.Migrated;
    }

    /**
     * @notice Get claimable amount for a shipped feature
     */
    function getClaimableAmount(bytes32 featureId, address[] calldata voters) external view returns (uint256) {
        Feature storage feature = features[featureId];
        if (feature.status != FeatureStatus.Shipped) return 0;

        uint256 total = 0;
        for (uint256 i = 0; i < voters.length; i++) {
            Vote storage voteData = votes[featureId][voters[i]];
            if (voteData.tokensLocked > 0 && !voteData.withdrawn && !voteData.claimedByOwner) {
                total += voteData.tokensLocked;
            }
        }
        return total;
    }

    /**
     * @notice Get feature vote totals
     */
    function getFeatureVoteTotals(bytes32 featureId) external view returns (
        uint256 upvoteTokens,
        uint256 downvoteTokens,
        int256 netTokens
    ) {
        Feature storage feature = features[featureId];
        upvoteTokens = feature.totalUpvoteTokens;
        downvoteTokens = feature.totalDownvoteTokens;
        netTokens = int256(upvoteTokens) - int256(downvoteTokens);
    }

    /**
     * @notice Get total platform fees for a project
     */
    function getPlatformFees(bytes32 projectId) external view returns (uint256) {
        return accumulatedFees[projectId];
    }
}
