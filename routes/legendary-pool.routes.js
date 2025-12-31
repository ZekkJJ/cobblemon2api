/**
 * Legendary Pool Routes - Sistema de invocación comunitaria de legendarios
 * Cobblemon Los Pitufos
 * 
 * ANTI-EXPLOIT DESIGN:
 * 1. Las contribuciones se descuentan INMEDIATAMENTE del balance en backend
 * 2. Se crea un "locked_balance" que NO se puede recuperar con /syncnow
 * 3. El plugin valida balance ANTES de permitir contribución
 * 4. Todas las transacciones son atómicas con MongoDB transactions
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { ObjectId } = require('mongodb');

// Legendarios disponibles para el pool
const POOL_LEGENDARIES = [
  { name: 'Rayquaza', sprite: 'rayquaza', goalMultiplier: 1.0, rarity: 'legendary', dexId: 384 },
  { name: 'Mewtwo', sprite: 'mewtwo', goalMultiplier: 1.2, rarity: 'legendary', dexId: 150 },
  { name: 'Giratina', sprite: 'giratina', goalMultiplier: 1.1, rarity: 'legendary', dexId: 487 },
  { name: 'Dialga', sprite: 'dialga', goalMultiplier: 1.0, rarity: 'legendary', dexId: 483 },
  { name: 'Palkia', sprite: 'palkia', goalMultiplier: 1.0, rarity: 'legendary', dexId: 484 },
  { name: 'Arceus', sprite: 'arceus', goalMultiplier: 2.0, rarity: 'mythical', dexId: 493 },
  { name: 'Lugia', sprite: 'lugia', goalMultiplier: 0.9, rarity: 'legendary', dexId: 249 },
  { name: 'Ho-Oh', sprite: 'ho-oh', goalMultiplier: 0.9, rarity: 'legendary', dexId: 250 },
  { name: 'Kyogre', sprite: 'kyogre', goalMultiplier: 1.0, rarity: 'legendary', dexId: 382 },
  { name: 'Groudon', sprite: 'groudon', goalMultiplier: 1.0, rarity: 'legendary', dexId: 383 },
  { name: 'Zekrom', sprite: 'zekrom', goalMultiplier: 1.0, rarity: 'legendary', dexId: 644 },
  { name: 'Reshiram', sprite: 'reshiram', goalMultiplier: 1.0, rarity: 'legendary', dexId: 643 },
];

// Base goal amount (10 million CobbleDollars)
const BASE_GOAL = 10000000;

// Minimum contribution
const MIN_CONTRIBUTION = 1000;

// Maximum contribution per transaction (prevent accidents)
const MAX_CONTRIBUTION = 5000000; // 5 million max per transaction

// Refund percentage if pool expires
const REFUND_PERCENTAGE = 0.80; // 80% refund

function initLegendaryPoolRoutes(getDb, getClient) {
  
  const getPoolsCollection = () => getDb().collection('legendary_pools');
  const getContributionsCollection = () => getDb().collection('pool_contributions');
  const getLockedBalanceCollection = () => getDb().collection('locked_balances');
  const getUsersCollection = () => getDb().collection('users');
  const getPoolHistoryCollection = () => getDb().collection('pool_history');

  // ============================================
  // GET /api/legendary-pool/active - Get current active pool
  // ============================================
  router.get('/active', async (req, res) => {
    try {
      const pool = await getPoolsCollection().findOne({ 
        status: { $in: ['active', 'completed'] } 
      });

      if (!pool) {
        return res.json({ success: true, pool: null, message: 'No active pool' });
      }

      // Get top contributors
      const contributors = await getContributionsCollection()
        .find({ poolId: pool._id.toString() })
        .sort({ totalContributed: -1 })
        .limit(10)
        .toArray();

      // Calculate percentages and ranks
      const contributorsWithRank = contributors.map((c, index) => ({
        ...c,
        rank: index + 1,
        percentage: pool.currentAmount > 0 
          ? ((c.totalContributed / pool.currentAmount) * 100).toFixed(2)
          : 0
      }));

      res.json({
        success: true,
        pool: {
          ...pool,
          _id: pool._id.toString(),
          contributors: contributorsWithRank,
          topContributor: contributorsWithRank[0] || null,
          progress: ((pool.currentAmount / pool.goalAmount) * 100).toFixed(2),
          timeRemaining: pool.expiresAt ? new Date(pool.expiresAt) - new Date() : null
        }
      });
    } catch (error) {
      console.error('[LEGENDARY POOL] Error getting active pool:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ============================================
  // GET /api/legendary-pool/my-contribution/:uuid - Get player's contribution
  // ============================================
  router.get('/my-contribution/:uuid', async (req, res) => {
    try {
      const { uuid } = req.params;
      
      const pool = await getPoolsCollection().findOne({ status: 'active' });
      if (!pool) {
        return res.json({ success: true, contribution: null });
      }

      const contribution = await getContributionsCollection().findOne({
        poolId: pool._id.toString(),
        minecraftUuid: uuid
      });

      // Get locked balance
      const lockedBalance = await getLockedBalanceCollection().findOne({
        minecraftUuid: uuid,
        poolId: pool._id.toString()
      });

      res.json({
        success: true,
        contribution: contribution ? {
          ...contribution,
          lockedAmount: lockedBalance?.amount || 0
        } : null
      });
    } catch (error) {
      console.error('[LEGENDARY POOL] Error getting contribution:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ============================================
  // POST /api/legendary-pool/contribute - Contribute to pool (ANTI-EXPLOIT)
  // ============================================
  router.post('/contribute', async (req, res) => {
    const client = getClient();
    const session = client.startSession();
    
    try {
      const { minecraftUuid, amount, username } = req.body;

      // Validate required fields
      if (!minecraftUuid || !amount) {
        return res.status(400).json({ 
          success: false, 
          error: 'minecraftUuid and amount are required' 
        });
      }

      // Validate amount is a number
      const contributionAmount = parseInt(amount);
      if (isNaN(contributionAmount) || contributionAmount <= 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'Amount must be a positive number' 
        });
      }

      // Validate minimum contribution
      if (contributionAmount < MIN_CONTRIBUTION) {
        return res.status(400).json({ 
          success: false, 
          error: `Minimum contribution is ${MIN_CONTRIBUTION.toLocaleString()} CobbleDollars` 
        });
      }

      // Validate maximum contribution per transaction
      if (contributionAmount > MAX_CONTRIBUTION) {
        return res.status(400).json({ 
          success: false, 
          error: `Maximum contribution per transaction is ${MAX_CONTRIBUTION.toLocaleString()} CobbleDollars` 
        });
      }

      let result = null;

      // Start transaction for atomicity
      await session.withTransaction(async () => {
        // 1. Get active pool
        const pool = await getPoolsCollection().findOne(
          { status: 'active' },
          { session }
        );

        if (!pool) {
          throw new Error('No hay un pool activo en este momento');
        }

        // Check if pool is expired
        if (pool.expiresAt && new Date(pool.expiresAt) < new Date()) {
          throw new Error('El pool ha expirado');
        }

        // Check if pool is already at goal (race condition prevention)
        if (pool.currentAmount >= pool.goalAmount) {
          throw new Error('El pool ya alcanzó su meta');
        }

        // 2. Get user's current balance
        const user = await getUsersCollection().findOne(
          { minecraftUuid },
          { session }
        );

        if (!user) {
          throw new Error('Jugador no encontrado. Debes verificar tu cuenta primero.');
        }

        const currentBalance = user.cobbleDollars || 0;

        // 3. Check if user has enough balance
        if (currentBalance < contributionAmount) {
          throw new Error(`Balance insuficiente. Tienes ${currentBalance.toLocaleString()} CD, necesitas ${contributionAmount.toLocaleString()} CD`);
        }

        // 4. IMMEDIATELY deduct from user's balance (ANTI-EXPLOIT)
        const newBalance = currentBalance - contributionAmount;
        await getUsersCollection().updateOne(
          { minecraftUuid },
          { 
            $set: { 
              cobbleDollars: newBalance,
              lastPoolContribution: new Date()
            }
          },
          { session }
        );

        // 5. Create/update locked balance record (prevents /syncnow exploit)
        await getLockedBalanceCollection().updateOne(
          { minecraftUuid, poolId: pool._id.toString() },
          {
            $inc: { amount: contributionAmount },
            $set: { 
              username: username || user.minecraftUsername,
              lastUpdate: new Date()
            },
            $setOnInsert: {
              createdAt: new Date()
            }
          },
          { upsert: true, session }
        );

        // 6. Update contribution record
        const contributionId = crypto.randomBytes(8).toString('hex');
        await getContributionsCollection().updateOne(
          { minecraftUuid, poolId: pool._id.toString() },
          {
            $inc: { totalContributed: contributionAmount },
            $push: {
              contributions: {
                id: contributionId,
                amount: contributionAmount,
                timestamp: new Date()
              }
            },
            $set: {
              username: username || user.minecraftUsername,
              lastContribution: new Date()
            },
            $setOnInsert: {
              createdAt: new Date()
            }
          },
          { upsert: true, session }
        );

        // 7. Update pool total
        const newPoolAmount = pool.currentAmount + contributionAmount;
        const poolCompleted = newPoolAmount >= pool.goalAmount;
        
        await getPoolsCollection().updateOne(
          { _id: pool._id },
          {
            $inc: { currentAmount: contributionAmount },
            $set: { 
              lastUpdate: new Date(),
              ...(poolCompleted ? { status: 'completed', completedAt: new Date() } : {})
            }
          },
          { session }
        );

        // 8. Log transaction for audit
        await getDb().collection('pool_transactions').insertOne({
          type: 'contribution',
          poolId: pool._id.toString(),
          minecraftUuid,
          username: username || user.minecraftUsername,
          amount: contributionAmount,
          previousBalance: currentBalance,
          newBalance,
          poolAmountBefore: pool.currentAmount,
          poolAmountAfter: newPoolAmount,
          timestamp: new Date(),
          transactionId: contributionId
        }, { session });

        result = {
          poolId: pool._id.toString(),
          newPoolAmount,
          poolCompleted,
          goalAmount: pool.goalAmount
        };

        console.log(`[LEGENDARY POOL] ${username || minecraftUuid} contributed ${contributionAmount} CD. Pool: ${newPoolAmount}/${pool.goalAmount}`);
      });

      // Get updated data after transaction
      const pool = await getPoolsCollection().findOne({ _id: new (require('mongodb').ObjectId)(result.poolId) });
      const contribution = await getContributionsCollection().findOne({
        poolId: result.poolId,
        minecraftUuid
      });

      // Get rank
      const allContributions = await getContributionsCollection()
        .find({ poolId: result.poolId })
        .sort({ totalContributed: -1 })
        .toArray();
      
      const rank = allContributions.findIndex(c => c.minecraftUuid === minecraftUuid) + 1;
      const isTopContributor = rank === 1;

      res.json({
        success: true,
        message: '¡Contribución exitosa!',
        newTotal: pool.currentAmount,
        poolProgress: ((pool.currentAmount / pool.goalAmount) * 100).toFixed(2),
        yourTotal: contribution.totalContributed,
        yourRank: rank,
        isTopContributor,
        poolCompleted: pool.status === 'completed'
      });

    } catch (error) {
      console.error('[LEGENDARY POOL] Contribution error:', error);
      res.status(400).json({ success: false, error: error.message });
    } finally {
      await session.endSession();
    }
  });

  // ============================================
  // GET /api/legendary-pool/leaderboard - Get contribution leaderboard
  // ============================================
  router.get('/leaderboard', async (req, res) => {
    try {
      const pool = await getPoolsCollection().findOne({ 
        status: { $in: ['active', 'completed'] } 
      });

      if (!pool) {
        return res.json({ success: true, leaderboard: [] });
      }

      const contributions = await getContributionsCollection()
        .find({ poolId: pool._id.toString() })
        .sort({ totalContributed: -1 })
        .limit(50)
        .toArray();

      // Prevent division by zero
      const totalAmount = pool.currentAmount || 1;

      const leaderboard = contributions.map((c, index) => ({
        rank: index + 1,
        username: c.username || 'Unknown',
        minecraftUuid: c.minecraftUuid,
        totalContributed: c.totalContributed || 0,
        percentage: ((c.totalContributed / totalAmount) * 100).toFixed(2),
        contributionCount: c.contributions?.length || 1
      }));

      res.json({ success: true, leaderboard });
    } catch (error) {
      console.error('[LEGENDARY POOL] Error getting leaderboard:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ============================================
  // GET /api/legendary-pool/history - Get past pools
  // ============================================
  router.get('/history', async (req, res) => {
    try {
      const history = await getPoolHistoryCollection()
        .find({})
        .sort({ completedAt: -1 })
        .limit(20)
        .toArray();

      res.json({ success: true, history });
    } catch (error) {
      console.error('[LEGENDARY POOL] Error getting history:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ============================================
  // POST /api/legendary-pool/spawn - Spawn the legendary (PLUGIN ONLY)
  // Called by plugin when pool is completed
  // ============================================
  router.post('/spawn', async (req, res) => {
    try {
      const { poolId, spawnLocation, spawnedBy } = req.body;

      if (!poolId) {
        return res.status(400).json({ success: false, error: 'poolId is required' });
      }

      let objectId;
      try {
        objectId = new ObjectId(poolId);
      } catch {
        return res.status(400).json({ success: false, error: 'Invalid poolId format' });
      }

      const pool = await getPoolsCollection().findOne({ 
        _id: objectId,
        status: 'completed'
      });

      if (!pool) {
        return res.status(404).json({ success: false, error: 'Pool not found or not completed' });
      }

      // Update pool status
      await getPoolsCollection().updateOne(
        { _id: pool._id },
        {
          $set: {
            status: 'spawned',
            spawnLocation: spawnLocation || 'Estadio Principal',
            spawnedAt: new Date(),
            spawnedBy: spawnedBy || 'Admin'
          }
        }
      );

      // Get top contributor for bonus
      const topContributor = await getContributionsCollection()
        .findOne(
          { poolId: pool._id.toString() },
          { sort: { totalContributed: -1 } }
        );

      // Clear locked balances (money is now "spent")
      await getLockedBalanceCollection().deleteMany({ poolId: pool._id.toString() });

      // Save to history
      const totalContributors = await getContributionsCollection().countDocuments({ poolId: pool._id.toString() });
      
      await getPoolHistoryCollection().insertOne({
        poolId: pool._id.toString(),
        targetPokemon: pool.targetPokemon,
        targetLevel: pool.targetLevel,
        goalAmount: pool.goalAmount,
        finalAmount: pool.currentAmount,
        status: 'spawned',
        topContributorId: topContributor?.minecraftUuid,
        topContributorUsername: topContributor?.username,
        topContributorAmount: topContributor?.totalContributed,
        totalContributors,
        spawnLocation: spawnLocation || 'Estadio Principal',
        completedAt: pool.completedAt,
        spawnedAt: new Date()
      });

      // Return spawn command for plugin
      const pokemonName = pool.targetPokemon.toLowerCase().replace(/[^a-z]/g, '');
      const spawnCommand = `pokespawn ${pokemonName} level=${pool.targetLevel}`;

      console.log(`[LEGENDARY POOL] Spawned ${pool.targetPokemon} Lv.${pool.targetLevel}. Top contributor: ${topContributor?.username || 'N/A'}`);

      res.json({
        success: true,
        spawnCommand,
        pokemon: pool.targetPokemon,
        level: pool.targetLevel,
        topContributor: topContributor ? {
          uuid: topContributor.minecraftUuid,
          username: topContributor.username,
          bonusChance: 25 // 25% extra catch rate
        } : null
      });

    } catch (error) {
      console.error('[LEGENDARY POOL] Spawn error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ============================================
  // POST /api/legendary-pool/capture - Record who captured the legendary
  // ============================================
  router.post('/capture', async (req, res) => {
    try {
      const { poolId, capturedBy, capturedByUuid } = req.body;

      await getPoolHistoryCollection().updateOne(
        { poolId },
        {
          $set: {
            winnerId: capturedByUuid,
            winnerUsername: capturedBy,
            capturedAt: new Date()
          }
        }
      );

      res.json({ success: true });
    } catch (error) {
      console.error('[LEGENDARY POOL] Capture record error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ============================================
  // ADMIN: POST /api/legendary-pool/create - Create new pool
  // ============================================
  router.post('/create', async (req, res) => {
    try {
      const { targetPokemon, targetLevel, goalAmount, durationDays } = req.body;

      // Check no active pool exists
      const existingPool = await getPoolsCollection().findOne({ status: 'active' });
      if (existingPool) {
        return res.status(400).json({ 
          success: false, 
          error: 'An active pool already exists' 
        });
      }

      // Find legendary config
      const legendaryConfig = POOL_LEGENDARIES.find(
        l => l.name.toLowerCase() === targetPokemon.toLowerCase()
      );

      const finalGoal = goalAmount || Math.round(BASE_GOAL * (legendaryConfig?.goalMultiplier || 1));
      const duration = (durationDays || 7) * 24 * 60 * 60 * 1000;

      const pool = {
        targetPokemon: legendaryConfig?.name || targetPokemon,
        targetLevel: targetLevel || 100,
        goalAmount: finalGoal,
        currentAmount: 0,
        status: 'active',
        contributors: [],
        rewards: {
          topContributorBonus: 25, // 25% extra catch rate
          participationReward: 'ultra_ball',
          participationAmount: 5,
          milestoneRewards: [
            { percentage: 25, reward: '5x Great Ball', claimed: false },
            { percentage: 50, reward: '3x Ultra Ball', claimed: false },
            { percentage: 75, reward: '1x Timer Ball', claimed: false },
            { percentage: 100, reward: 'Legendary Spawn!', claimed: false }
          ]
        },
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + duration),
        spawnLocation: 'Estadio Principal'
      };

      const result = await getPoolsCollection().insertOne(pool);

      console.log(`[LEGENDARY POOL] New pool created: ${pool.targetPokemon} - Goal: ${finalGoal} CD`);

      res.json({
        success: true,
        pool: { ...pool, _id: result.insertedId.toString() }
      });

    } catch (error) {
      console.error('[LEGENDARY POOL] Create error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ============================================
  // ADMIN: POST /api/legendary-pool/expire - Force expire and refund
  // ============================================
  router.post('/expire', async (req, res) => {
    const client = getClient();
    const session = client.startSession();

    try {
      const { poolId } = req.body;

      if (!poolId) {
        return res.status(400).json({ success: false, error: 'poolId is required' });
      }

      let objectId;
      try {
        objectId = new ObjectId(poolId);
      } catch {
        return res.status(400).json({ success: false, error: 'Invalid poolId format' });
      }

      let refundCount = 0;
      let totalRefunded = 0;

      await session.withTransaction(async () => {
        const pool = await getPoolsCollection().findOne(
          { _id: objectId, status: 'active' },
          { session }
        );

        if (!pool) {
          throw new Error('Active pool not found');
        }

        // Get all contributions
        const contributions = await getContributionsCollection()
          .find({ poolId: pool._id.toString() })
          .toArray();

        // Refund 80% to each contributor
        for (const contrib of contributions) {
          const refundAmount = Math.floor(contrib.totalContributed * REFUND_PERCENTAGE);
          
          if (refundAmount > 0) {
            await getUsersCollection().updateOne(
              { minecraftUuid: contrib.minecraftUuid },
              { $inc: { cobbleDollars: refundAmount } },
              { session }
            );

            // Log refund
            await getDb().collection('pool_transactions').insertOne({
              type: 'refund',
              poolId: pool._id.toString(),
              minecraftUuid: contrib.minecraftUuid,
              username: contrib.username,
              originalAmount: contrib.totalContributed,
              refundAmount,
              refundPercentage: REFUND_PERCENTAGE,
              timestamp: new Date()
            }, { session });

            refundCount++;
            totalRefunded += refundAmount;
          }
        }

        // Update pool status
        await getPoolsCollection().updateOne(
          { _id: pool._id },
          { $set: { status: 'expired', expiredAt: new Date() } },
          { session }
        );

        // Clear locked balances
        await getLockedBalanceCollection().deleteMany(
          { poolId: pool._id.toString() },
          { session }
        );

        // Save to history
        await getPoolHistoryCollection().insertOne({
          poolId: pool._id.toString(),
          targetPokemon: pool.targetPokemon,
          goalAmount: pool.goalAmount,
          finalAmount: pool.currentAmount,
          status: 'expired',
          totalContributors: contributions.length,
          refundPercentage: REFUND_PERCENTAGE,
          totalRefunded,
          expiredAt: new Date()
        }, { session });
      });

      console.log(`[LEGENDARY POOL] Pool expired. Refunded ${totalRefunded} CD to ${refundCount} contributors`);

      res.json({ 
        success: true, 
        message: `Pool expirado. Se reembolsaron ${totalRefunded.toLocaleString()} CD a ${refundCount} contribuidores (${REFUND_PERCENTAGE * 100}%)` 
      });

    } catch (error) {
      console.error('[LEGENDARY POOL] Expire error:', error);
      res.status(500).json({ success: false, error: error.message });
    } finally {
      await session.endSession();
    }
  });

  // ============================================
  // GET /api/legendary-pool/locked-balance/:uuid - Check locked balance
  // Used by plugin to prevent /syncnow exploit
  // ============================================
  router.get('/locked-balance/:uuid', async (req, res) => {
    try {
      const { uuid } = req.params;

      const lockedBalances = await getLockedBalanceCollection()
        .find({ minecraftUuid: uuid })
        .toArray();

      const totalLocked = lockedBalances.reduce((sum, lb) => sum + lb.amount, 0);

      res.json({
        success: true,
        totalLocked,
        details: lockedBalances
      });
    } catch (error) {
      console.error('[LEGENDARY POOL] Error getting locked balance:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ============================================
  // GET /api/legendary-pool/available-legendaries - Get list of available legendaries
  // ============================================
  router.get('/available-legendaries', async (req, res) => {
    res.json({
      success: true,
      legendaries: POOL_LEGENDARIES,
      baseGoal: BASE_GOAL,
      minContribution: MIN_CONTRIBUTION,
      refundPercentage: REFUND_PERCENTAGE
    });
  });

  return router;
}

module.exports = { initLegendaryPoolRoutes };
