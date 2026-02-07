// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ProjectRanking
 * @notice Simple upvote/downvote system for ranking projects on the main page
 * @dev Uses UUID stored as bytes32 for project identification
 */
contract ProjectRanking {
    /// @dev Project storage
    struct Project {
        uint256 totalUpvotes;
        uint256 totalDownvotes;
        bool exists;
    }

    /// @dev Mapping from project ID (bytes32) to Project data
    mapping(bytes32 => Project) public projects;

    /// @dev Platform fee percentage (1% = 10,000 / 1,000,000)
    uint256 public constant FEE_PERCENTAGE = 10_000; // 1%
    uint256 public constant FEE_DENOMINATOR = 1_000_000;

    /// @dev Platform fee recipient
    address public platformFeeRecipient;

    /// @dev Contract owner
    address public owner;

    /// @dev Accumulated fees per project (for platform to withdraw)
    mapping(bytes32 => uint256) public accumulatedFees;

    /// @dev Track if an address has voted on a project (prevent repeat voting)
    mapping(bytes32 => mapping(address => bool)) public hasVoted;

    // ========== Events ==========

    event ProjectVoted(
        bytes32 indexed projectId,
        address indexed voter,
        bool isUpvote,
        uint256 timestamp
    );

    event PlatformFeeRecipientUpdated(
        address indexed oldRecipient,
        address indexed newRecipient
    );

    event PlatformFeesWithdrawn(
        bytes32 indexed projectId,
        address indexed recipient,
        uint256 amount
    );

    event OwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner
    );

    // ========== Modifiers ==========

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    // ========== Constructor ==========

    constructor(address _platformFeeRecipient) {
        owner = msg.sender;
        platformFeeRecipient = _platformFeeRecipient;
    }

    // ========== Core Functions ==========

    /**
     * @notice Vote on a project (upvote or downvote)
     * @param projectId The project ID as bytes32 (UUID)
     * @param isUpvote True for upvote, false for downvote
     * @dev One vote per address per project
     */
    function voteProject(bytes32 projectId, bool isUpvote) external {
        // Check if already voted
        require(!hasVoted[projectId][msg.sender], "Already voted on this project");

        // Initialize project if it doesn't exist
        if (!projects[projectId].exists) {
            projects[projectId] = Project({
                totalUpvotes: 0,
                totalDownvotes: 0,
                exists: true
            });
        }

        // Record vote
        if (isUpvote) {
            projects[projectId].totalUpvotes++;
        } else {
            projects[projectId].totalDownvotes++;
        }

        // Mark as voted
        hasVoted[projectId][msg.sender] = true;

        emit ProjectVoted(projectId, msg.sender, isUpvote, block.timestamp);
    }

    /**
     * @notice Get the score of a project (upvotes - downvotes)
     * @param projectId The project ID as bytes32
     * @return score The net score (can be negative)
     */
    function getProjectScore(bytes32 projectId) external view returns (int256) {
        if (!projects[projectId].exists) {
            return 0;
        }
        Project memory project = projects[projectId];
        return int256(project.totalUpvotes) - int256(project.totalDownvotes);
    }

    /**
     * @notice Get full project vote data
     * @param projectId The project ID as bytes32
     * @return totalUpvotes Total upvotes
     * @return totalDownvotes Total downvotes
     * @return score Net score (upvotes - downvotes)
     * @return exists Whether the project exists
     */
    function getProjectVotes(bytes32 projectId)
        external
        view
        returns (
            uint256 totalUpvotes,
            uint256 totalDownvotes,
            int256 score,
            bool exists
        )
    {
        Project memory project = projects[projectId];
        return (
            project.totalUpvotes,
            project.totalDownvotes,
            int256(project.totalUpvotes) - int256(project.totalDownvotes),
            project.exists
        );
    }

    /**
     * @notice Check if a project exists
     * @param projectId The project ID as bytes32
     * @return exists True if the project has been voted on
     */
    function projectExists(bytes32 projectId) external view returns (bool) {
        return projects[projectId].exists;
    }

    // ========== Admin Functions ==========

    /**
     * @notice Set the platform fee recipient
     * @param _platformFeeRecipient New fee recipient address
     */
    function setPlatformFeeRecipient(address _platformFeeRecipient)
        external
        onlyOwner
    {
        address oldRecipient = platformFeeRecipient;
        platformFeeRecipient = _platformFeeRecipient;
        emit PlatformFeeRecipientUpdated(oldRecipient, _platformFeeRecipient);
    }

    /**
     * @notice Transfer ownership
     * @param newOwner New owner address
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "New owner is zero address");
        address oldOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }

    // ========== Utility Functions ==========

    /**
     * @notice Check if an address has voted on a project
     * @param projectId The project ID as bytes32
     * @param voter The voter address
     * @return hasVoted True if the address has voted
     */
    function hasVotedOnProject(bytes32 projectId, address voter)
        external
        view
        returns (bool)
    {
        return hasVoted[projectId][voter];
    }
}
