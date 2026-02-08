// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ProjectRankingToken
 * @notice Token-based project ranking - spend $ROAD to vote on projects
 * @dev Users can vote multiple times by spending more tokens
 */
contract ProjectRankingToken {
    /// @dev Project storage
    struct Project {
        uint256 totalUpvotes;
        uint256 totalDownvotes;
        uint256 totalTokensSpent;
        bool exists;
    }

    /// @dev Mapping from project ID (bytes32) to Project data
    mapping(bytes32 => Project) public projects;

    /// @dev $ROAD token interface
    IERC20 public ROAD_TOKEN;

    /// @dev Platform fee percentage (1%)
    uint256 public constant FEE_PERCENTAGE = 100; // 1% out of 10000
    uint256 public constant FEE_DENOMINATOR = 10000;

    /// @dev Platform fee recipient
    address public platformFeeRecipient;

    /// @dev Contract owner
    address public owner;

    /// @dev Amount of tokens required per vote
    uint256 public votePrice = 1_000_000 * 1e18; // 1 million $ROAD per vote

    // ========== Events ==========

    event ProjectVoted(
        bytes32 indexed projectId,
        address indexed voter,
        bool isUpvote,
        uint256 tokenAmount,
        uint256 feePaid,
        uint256 timestamp
    );

    event PlatformFeeRecipientUpdated(
        address indexed oldRecipient,
        address indexed newRecipient
    );

    event VotePriceUpdated(uint256 oldPrice, uint256 newPrice);

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

    constructor(address _platformFeeRecipient, address _roadToken) {
        owner = msg.sender;
        platformFeeRecipient = _platformFeeRecipient;
        ROAD_TOKEN = IERC20(_roadToken);
    }

    // ========== Core Functions ==========

    /**
     * @notice Vote on a project using $ROAD tokens
     * @param projectId The project ID as bytes32 (UUID)
     * @param voteCount Number of votes to cast (each costs votePrice tokens)
     * @param isUpvote True for upvote, false for downvote
     * @dev Users must approve this contract to spend their $ROAD tokens first
     */
    function voteProject(bytes32 projectId, uint256 voteCount, bool isUpvote) external {
        require(voteCount > 0, "Vote count must be greater than 0");

        // Calculate total tokens needed
        uint256 totalTokens = votePrice * voteCount;

        // Calculate platform fee (1%)
        uint256 fee = (totalTokens * FEE_PERCENTAGE) / FEE_DENOMINATOR;
        uint256 tokensForProject = totalTokens - fee;

        // Initialize project if it doesn't exist
        if (!projects[projectId].exists) {
            projects[projectId] = Project({
                totalUpvotes: 0,
                totalDownvotes: 0,
                totalTokensSpent: 0,
                exists: true
            });
        }

        // Transfer tokens from user to this contract
        require(
            ROAD_TOKEN.transferFrom(msg.sender, address(this), totalTokens),
            "Token transfer failed. Make sure you've approved this contract."
        );

        // Transfer fee to platform fee recipient
        if (fee > 0) {
            require(ROAD_TOKEN.transfer(platformFeeRecipient, fee), "Fee transfer failed");
        }

        // Update project stats
        Project storage project = projects[projectId];
        if (isUpvote) {
            project.totalUpvotes += voteCount;
        } else {
            project.totalDownvotes += voteCount;
        }
        project.totalTokensSpent += tokensForProject;
        projects[projectId] = project;

        emit ProjectVoted(projectId, msg.sender, isUpvote, tokensForProject, fee, block.timestamp);
    }

    /**
     * @notice Get the score of a project (upvotes - downvotes)
     * @param projectId The project ID as bytes32
     * @return score The net score
     */
    function getProjectScore(bytes32 projectId) external view returns (uint256) {
        if (!projects[projectId].exists) {
            return 0;
        }
        Project memory project = projects[projectId];
        return project.totalUpvotes - project.totalDownvotes;
    }

    /**
     * @notice Get full project vote data
     * @param projectId The project ID as bytes32
     * @return totalUpvotes Total upvotes
     * @return totalDownvotes Total downvotes
     * @return totalTokensSpent Total tokens spent on this project
     * @return score Net score (upvotes - downvotes)
     * @return exists Whether the project exists
     */
    function getProjectVotes(bytes32 projectId)
        external
        view
        returns (
            uint256 totalUpvotes,
            uint256 totalDownvotes,
            uint256 totalTokensSpent,
            uint256 score,
            bool exists
        )
    {
        Project memory project = projects[projectId];
        return (
            project.totalUpvotes,
            project.totalDownvotes,
            project.totalTokensSpent,
            project.totalUpvotes - project.totalDownvotes,
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
     * @notice Set the vote price (tokens per vote)
     * @param _votePrice New vote price in wei
     */
    function setVotePrice(uint256 _votePrice) external onlyOwner {
        uint256 oldPrice = votePrice;
        votePrice = _votePrice;
        emit VotePriceUpdated(oldPrice, _votePrice);
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

    /**
     * @notice Withdraw any tokens accidentally sent to this contract
     * @param token Token address to withdraw
     * @param amount Amount to withdraw
     * @param recipient Address to send tokens to
     */
    function withdrawTokens(address token, uint256 amount, address recipient) external onlyOwner {
        IERC20(token).transfer(recipient, amount);
    }
}

interface IERC20 {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function transfer(address recipient, uint256 amount) external returns (bool);
}
