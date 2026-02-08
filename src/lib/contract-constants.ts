/**
 * Smart Contract ABIs and Constants
 * Centralized contract ABI definitions for type safety and maintainability
 */

// ============================================
// CONTRACT 1: ProjectRanking (Simple)
// ============================================

export const PROJECT_RANKING_ABI = [
  // Vote on project (upvote/downvote)
  {
    "inputs": [
      {"name": "projectId", "type": "bytes32"},
      {"name": "isUpvote", "type": "bool"}
    ],
    "name": "voteProject",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  // Get project score
  {
    "inputs": [{"name": "projectId", "type": "bytes32"}],
    "name": "getProjectScore",
    "outputs": [{"name": "", "type": "bigint"}],
    "stateMutability": "view",
    "type": "function"
  },
  // Get full project votes
  {
    "inputs": [{"name": "projectId", "type": "bytes32"}],
    "name": "getProjectVotes",
    "outputs": [
      {"name": "totalUpvotes", "type": "ubigint"},
      {"name": "totalDownvotes", "type": "ubigint"},
      {"name": "score", "type": "bigint"},
      {"name": "exists", "type": "bool"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  // Check if project exists
  {
    "inputs": [{"name": "projectId", "type": "bytes32"}],
    "name": "projectExists",
    "outputs": [{"name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  // Check if address voted
  {
    "inputs": [
      {"name": "projectId", "type": "bytes32"},
      {"name": "voter", "type": "address"}
    ],
    "name": "hasVotedOnProject",
    "outputs": [{"name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  // Platform fee management
  {
    "inputs": [{"name": "_platformFeeRecipient", "type": "address"}],
    "name": "setPlatformFeeRecipient",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "platformFeeRecipient",
    "outputs": [{"name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [{"name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

// Token-based voting on projects (ProjectRankingToken)
export const PROJECT_RANKING_TOKEN_ABI = [
  // Vote on project with tokens
  {
    "inputs": [
      {"name": "projectId", "type": "bytes32"},
      {"name": "voteCount", "type": "uint256"},
      {"name": "isUpvote", "type": "bool"}
    ],
    "name": "voteProject",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  // Get project score
  {
    "inputs": [{"name": "projectId", "type": "bytes32"}],
    "name": "getProjectScore",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  // Get full project votes
  {
    "inputs": [{"name": "projectId", "type": "bytes32"}],
    "name": "getProjectVotes",
    "outputs": [
      {"name": "totalUpvotes", "type": "uint256"},
      {"name": "totalDownvotes", "type": "uint256"},
      {"name": "totalTokensSpent", "type": "uint256"},
      {"name": "score", "type": "uint256"},
      {"name": "exists", "type": "bool"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  // Platform fee management
  {
    "inputs": [{"name": "_platformFeeRecipient", "type": "address"}],
    "name": "setPlatformFeeRecipient",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "platformFeeRecipient",
    "outputs": [{"name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [{"name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"name": "projectId", "type": "bytes32"}],
    "name": "projectExists",
    "outputs": [{"name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

// ============================================
// CONTRACT 2: RoadmaprVoting (Feature Voting)
// ============================================

export const ROADMAPR_VOTING_ABI = [
  // Migration
  {
    "inputs": [{"name": "_migrationContract", "type": "address"}],
    "name": "setMigrationContract",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"name": "featureId", "type": "bytes32"},
      {"name": "voters", "type": "address[]"}
    ],
    "name": "migrateFeature",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  // Platform fee
  {
    "inputs": [{"name": "_platformFeeRecipient", "type": "address"}],
    "name": "setPlatformFeeRecipient",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  // Project management
  {
    "inputs": [
      {"name": "projectId", "type": "bytes32"},
      {"name": "tokenAddress", "type": "address"},
      {"name": "voteIncrement", "type": "uint256"}
    ],
    "name": "registerProject",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"name": "projectId", "type": "bytes32"},
      {"name": "voteIncrement", "type": "uint256"}
    ],
    "name": "updateProject",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  // Voting
  {
    "inputs": [
      {"name": "featureId", "type": "bytes32"},
      {"name": "projectId", "type": "bytes32"},
      {"name": "voteCount", "type": "uint256"},
      {"name": "isUpvote", "type": "bool"}
    ],
    "name": "vote",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"name": "featureId", "type": "bytes32"}],
    "name": "withdrawVote",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  // Feature shipping
  {
    "inputs": [{"name": "featureId", "type": "bytes32"}],
    "name": "markFeatureShipped",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  // Token claiming
  {
    "inputs": [
      {"name": "featureId", "type": "bytes32"},
      {"name": "voters", "type": "address[]"}
    ],
    "name": "claimTokens",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"name": "featureIds", "type": "bytes32[]"},
      {"name": "votersPerFeature", "type": "address[][]"}
    ],
    "name": "batchClaimTokens",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  // Platform fee withdrawal
  {
    "inputs": [{"name": "projectId", "type": "bytes32"}],
    "name": "withdrawPlatformFees",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  // View functions
  {
    "inputs": [{"name": "featureId", "type": "bytes32"}],
    "name": "getFeature",
    "outputs": [{"components": [
      {"name": "projectId", "type": "bytes32"},
      {"name": "totalUpvoteTokens", "type": "uint256"},
      {"name": "totalDownvoteTokens", "type": "uint256"},
      {"name": "shippedAt", "type": "uint256"},
      {"name": "status", "type": "uint8"}
    ], "name": "", "type": "tuple"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"name": "featureId", "type": "bytes32"},
      {"name": "voters", "type": "address[]"}
    ],
    "name": "getClaimableAmount",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"name": "featureId", "type": "bytes32"},
      {"name": "voter", "type": "address"}
    ],
    "name": "canWithdraw",
    "outputs": [{"name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"name": "projectId", "type": "bytes32"}],
    "name": "getPlatformFees",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"name": "projectId", "type": "bytes32"}],
    "name": "getProject",
    "outputs": [
      {"name": "tokenAddress", "type": "address"},
      {"name": "owner", "type": "address"},
      {"name": "voteIncrement", "type": "uint256"},
      {"name": "totalFeesCollected", "type": "uint256"},
      {"name": "exists", "type": "bool"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "platformFeeRecipient",
    "outputs": [{"name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [{"name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

// ============================================
// ERC20 Token ABI
// ============================================

export const ERC20_ABI = [
  {
    "inputs": [
      {"internalType": "address", "name": "owner", "type": "address"},
      {"internalType": "address", "name": "spender", "type": "address"}
    ],
    "name": "allowance",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "spender", "type": "address"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "approve",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const;
