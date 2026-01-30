# Roadmapr Smart Contract Guide

## Summary

**Status**: Single V1 contract ready to deploy. No contracts currently deployed.

## Contract: `RoadmaprVoting.sol`

**Location**: `/Users/peth/Vibecoding/roadmapr/contracts/RoadmaprVoting.sol`

### V1 Features:
1. ✅ **Immediate claiming** - Owners can claim as soon as feature is "shipped"
2. ✅ **Flexible voter withdrawal** - Voters can withdraw anytime before owner claims
3. ✅ **Global platform fee** - 1% goes to platform owner (you, globally set)
4. ✅ **Project-level voting** - Main page upvotes/downvotes also collect 1% fee
5. ✅ **Migration support** - Ready for future upgrades (verification system, disputes, etc.)

## Flow

**Feature Voting (within projects):**
```
1. Users vote (tokens locked + 1% platform fee)
   ↓
2. Voters can withdraw anytime BEFORE owner claims
   ↓
3. Owner marks "shipped" → Can claim immediately
   ↓
4. Owner claims tokens (voters can no longer withdraw)
```

**Project Voting (main page ranking):**
```
1. Users upvote/downvote project (1% fee collected)
   ↓
2. Both upvotes AND downvotes collect fees
   ↓
3. Score may cancel out, but platform claims ALL fees
   ↓
4. Example: 0.1 upvote + 0.1 downvote = 0 score, but 0.2 fees for platform
```

## Token Safety

| Situation | What Happens |
|-----------|--------------|
| **Voter wants to withdraw** | Can withdraw anytime BEFORE owner claims |
| **Owner claims tokens** | Voters can no longer withdraw after claim |
| **Contract needs upgrade** | Migration function moves state to new version |

## 1% Platform Fee

**Where it goes**: Platform owner (you) - **global setting**

**How it's collected**: 1% deducted from every vote, separate from locked tokens

**How to withdraw**: Call `withdrawPlatformFees(projectId)` - only platform fee recipient can withdraw

**How to update recipient**: Call `setPlatformFeeRecipient(address)` - only contract owner can update

## Deployment

### Prerequisites:

```bash
# Environment variables needed:
ROADMAPR_CONTRACT_ADDRESS=0x...    # Set after deployment
ROADMAPR_PRIVATE_KEY=0x...          # Contract owner private key (for backend operations)
RPC_URL=https://mainnet.base.org    # Base RPC URL
```

### Deploy Command (using Forge):

```bash
# From contracts directory
forge build

# Deploy to Base mainnet
forge create RoadmaprVoting \
  --rpc-url https://mainnet.base.org \
  --private-key YOUR_PRIVATE_KEY \
  --verify

# Or deploy to Base testnet first
forge create RoadmaprVoting \
  --rpc-url https://sepolia.base.org \
  --private-key YOUR_PRIVATE_KEY
```

### After Deployment:

1. **Set environment variable**:
   ```bash
   ROADMAPR_CONTRACT_ADDRESS=0x... # deployed address
   ```

2. **Verify platform fee recipient**:
   - By default, set to contract deployer (you)
   - Can update with `setPlatformFeeRecipient(newAddress)`

3. **Register projects** (via API or directly):
   ```solidity
   registerProject(
     projectId,      // UUID from database
     tokenAddress,   // Project token
     voteIncrement   // Tokens per vote
   )
   ```

## Key Functions Reference

| Function | Who Can Call | What It Does |
|----------|--------------|--------------|
| `registerProject` | Anyone | Register new project for token voting |
| `voteProject` | Anyone | Vote on project for main page ranking (1% fee collected) |
| `vote` | Anyone | Lock tokens to vote on feature (1% fee collected) |
| `withdrawVote` | Voters | Withdraw tokens (before owner claims) |
| `markFeatureShipped` | Project owner | Mark feature as shipped (can now claim) |
| `claimTokens` | Project owner | Claim tokens from shipped feature |
| `withdrawPlatformFees` | Platform fee recipient | Withdraw accumulated 1% fees (from both project & feature votes) |
| `setPlatformFeeRecipient` | Contract owner | Update global platform fee recipient |
| `setMigrationContract` | Contract owner | Set destination for migrations |
| `migrateFeature` | Contract owner | Migrate feature to new contract version |

## API Integration

The contract helper is ready at `src/lib/contract.ts`:

```typescript
// Mark feature as shipped (owner can claim immediately)
await markFeatureShippedOnChain(featureId);

// Claim tokens (owner only)
await claimFeatureTokens(featureId, voterAddresses);

// Withdraw 1% platform fees (platform owner only)
await withdrawPlatformFees(projectId);
```

## Future Upgrades (via Migration)

The contract is ready for future upgrades including:
- Community verification period
- Dispute mechanism
- Delayed claiming

To migrate:
1. Deploy new contract version
2. Call `setMigrationContract(newContractAddress)`
3. Call `migrateFeature(featureId, votersArray)` for each feature
4. State is preserved - votes, projects, features all migrated

## Next Steps

1. **Test on testnet** - Deploy to Base Sepolia first
2. **Verify with wallet** - Check all functions work
3. **Deploy to mainnet** - When ready
4. **Update env vars** - Set `ROADMAPR_CONTRACT_ADDRESS`
5. **Register projects** - Enable token voting for projects
6. **Monitor fees** - Track accumulated 1% platform fees
