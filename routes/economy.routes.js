/**
 * Economy Routes - Endpoints para el sistema de economía del plugin
 * Cobblemon Los Pitufos
 * 
 * Estos endpoints son llamados por el plugin de Minecraft para:
 * - Consultar balance de jugadores
 * - Procesar transacciones (add/remove/set)
 * - Sincronizar economía entre plugin y web
 */

const express = require('express');
const router = express.Router();

/**
 * Initialize economy routes with database connection
 */
function initEconomyRoutes(getDb) {
  
  // Helper to get users collection
  const getUsersCollection = () => getDb().collection('users');
  const getTransactionsCollection = () => getDb().collection('economy_transactions');
  const getPendingSyncCollection = () => getDb().collection('economy_pending_sync');

  // ============================================
  // GET /api/economy/balance/:uuid - Get player balance
  // Plugin calls this to check balance before transactions
  // ============================================
  router.get('/balance/:uuid', async (req, res) => {
    try {
      const { uuid } = req.params;
      
      if (!uuid) {
        return res.status(400).json({ 
          success: false, 
          error: 'UUID is required' 
        });
      }

      const user = await getUsersCollection().findOne({ minecraftUuid: uuid });
      
      if (!user) {
        return res.json({ 
          success: true, 
          balance: 0,
          exists: false,
          message: 'Player not found, returning 0 balance'
        });
      }

      console.log(`[ECONOMY] Balance check for ${user.minecraftUsername || uuid}: ${user.cobbleDollars || 0}`);
      
      res.json({ 
        success: true, 
        balance: user.cobbleDollars || 0,
        exists: true,
        username: user.minecraftUsername
      });
    } catch (error) {
      console.error('[ECONOMY] Error getting balance:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error getting balance',
        message: error.message 
      });
    }
  });

  // ============================================
  // POST /api/economy/transaction - Process economy transaction
  // Plugin calls this for add/remove/set operations
  // ============================================
  router.post('/transaction', async (req, res) => {
    try {
      const { uuid, username, type, amount, reason, source } = req.body;
      
      if (!uuid) {
        return res.status(400).json({ 
          success: false, 
          error: 'UUID is required' 
        });
      }

      if (!type || !['add', 'remove', 'set'].includes(type)) {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid transaction type. Must be: add, remove, or set' 
        });
      }

      if (typeof amount !== 'number' || amount < 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'Amount must be a non-negative number' 
        });
      }

      // Find or create user
      let user = await getUsersCollection().findOne({ minecraftUuid: uuid });
      const previousBalance = user?.cobbleDollars || 0;
      let newBalance = previousBalance;

      // Calculate new balance based on transaction type
      switch (type) {
        case 'add':
          newBalance = previousBalance + amount;
          break;
        case 'remove':
          newBalance = Math.max(0, previousBalance - amount);
          break;
        case 'set':
          newBalance = amount;
          break;
      }

      // Update or create user
      if (user) {
        await getUsersCollection().updateOne(
          { minecraftUuid: uuid },
          { 
            $set: { 
              cobbleDollars: newBalance,
              lastEconomyUpdate: new Date()
            },
            $setOnInsert: {
              minecraftUsername: username
            }
          }
        );
      } else {
        // Create new user if doesn't exist
        await getUsersCollection().insertOne({
          minecraftUuid: uuid,
          minecraftUsername: username || 'Unknown',
          cobbleDollars: newBalance,
          createdAt: new Date(),
          lastEconomyUpdate: new Date()
        });
      }

      // Log transaction
      await getTransactionsCollection().insertOne({
        uuid,
        username: username || user?.minecraftUsername || 'Unknown',
        type,
        amount,
        previousBalance,
        newBalance,
        reason: reason || 'No reason provided',
        source: source || 'plugin',
        timestamp: new Date()
      });

      console.log(`[ECONOMY] Transaction: ${type} ${amount} for ${username || uuid} | ${previousBalance} -> ${newBalance} | Reason: ${reason || 'N/A'}`);

      res.json({ 
        success: true, 
        previousBalance,
        newBalance,
        type,
        amount
      });
    } catch (error) {
      console.error('[ECONOMY] Transaction error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Transaction failed',
        message: error.message 
      });
    }
  });

  // ============================================
  // POST /api/economy/transfer - Transfer between players
  // ============================================
  router.post('/transfer', async (req, res) => {
    try {
      const { fromUuid, toUuid, amount, reason } = req.body;
      
      if (!fromUuid || !toUuid) {
        return res.status(400).json({ 
          success: false, 
          error: 'fromUuid and toUuid are required' 
        });
      }

      if (typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'Amount must be a positive number' 
        });
      }

      // Get both users
      const fromUser = await getUsersCollection().findOne({ minecraftUuid: fromUuid });
      const toUser = await getUsersCollection().findOne({ minecraftUuid: toUuid });

      if (!fromUser) {
        return res.status(404).json({ 
          success: false, 
          error: 'Sender not found' 
        });
      }

      const fromBalance = fromUser.cobbleDollars || 0;
      
      if (fromBalance < amount) {
        return res.status(400).json({ 
          success: false, 
          error: 'Insufficient balance',
          currentBalance: fromBalance,
          required: amount
        });
      }

      const toBalance = toUser?.cobbleDollars || 0;

      // Perform transfer
      await getUsersCollection().updateOne(
        { minecraftUuid: fromUuid },
        { $set: { cobbleDollars: fromBalance - amount, lastEconomyUpdate: new Date() } }
      );

      if (toUser) {
        await getUsersCollection().updateOne(
          { minecraftUuid: toUuid },
          { $set: { cobbleDollars: toBalance + amount, lastEconomyUpdate: new Date() } }
        );
      } else {
        // Create recipient if doesn't exist
        await getUsersCollection().insertOne({
          minecraftUuid: toUuid,
          cobbleDollars: amount,
          createdAt: new Date(),
          lastEconomyUpdate: new Date()
        });
      }

      // Log both transactions
      const timestamp = new Date();
      await getTransactionsCollection().insertMany([
        {
          uuid: fromUuid,
          username: fromUser.minecraftUsername || 'Unknown',
          type: 'transfer_out',
          amount,
          previousBalance: fromBalance,
          newBalance: fromBalance - amount,
          reason: reason || `Transfer to ${toUuid}`,
          relatedUuid: toUuid,
          source: 'plugin',
          timestamp
        },
        {
          uuid: toUuid,
          username: toUser?.minecraftUsername || 'Unknown',
          type: 'transfer_in',
          amount,
          previousBalance: toBalance,
          newBalance: toBalance + amount,
          reason: reason || `Transfer from ${fromUuid}`,
          relatedUuid: fromUuid,
          source: 'plugin',
          timestamp
        }
      ]);

      console.log(`[ECONOMY] Transfer: ${amount} from ${fromUser.minecraftUsername || fromUuid} to ${toUser?.minecraftUsername || toUuid}`);

      res.json({ 
        success: true, 
        fromBalance: fromBalance - amount,
        toBalance: toBalance + amount,
        amount
      });
    } catch (error) {
      console.error('[ECONOMY] Transfer error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Transfer failed',
        message: error.message 
      });
    }
  });

  // ============================================
  // GET /api/economy/history/:uuid - Get transaction history
  // ============================================
  router.get('/history/:uuid', async (req, res) => {
    try {
      const { uuid } = req.params;
      const limit = parseInt(req.query.limit) || 50;
      
      const transactions = await getTransactionsCollection()
        .find({ uuid })
        .sort({ timestamp: -1 })
        .limit(limit)
        .toArray();

      res.json({ 
        success: true, 
        transactions,
        count: transactions.length
      });
    } catch (error) {
      console.error('[ECONOMY] Error getting history:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error getting transaction history' 
      });
    }
  });

  // ============================================
  // GET /api/economy/top - Get richest players
  // ============================================
  router.get('/top', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 10;
      
      const topPlayers = await getUsersCollection()
        .find({ cobbleDollars: { $gt: 0 } })
        .sort({ cobbleDollars: -1 })
        .limit(limit)
        .project({ 
          minecraftUuid: 1, 
          minecraftUsername: 1, 
          cobbleDollars: 1 
        })
        .toArray();

      res.json({ 
        success: true, 
        players: topPlayers
      });
    } catch (error) {
      console.error('[ECONOMY] Error getting top players:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error getting top players' 
      });
    }
  });

  // ============================================
  // POST /api/economy/sync - Bulk sync from plugin
  // Plugin can send multiple balances at once
  // ============================================
  router.post('/sync', async (req, res) => {
    try {
      const { players } = req.body;
      
      if (!Array.isArray(players)) {
        return res.status(400).json({ 
          success: false, 
          error: 'players must be an array' 
        });
      }

      let updated = 0;
      let created = 0;

      for (const player of players) {
        const { uuid, username, balance } = player;
        
        if (!uuid || typeof balance !== 'number') continue;

        const result = await getUsersCollection().updateOne(
          { minecraftUuid: uuid },
          { 
            $set: { 
              cobbleDollars: balance,
              minecraftUsername: username,
              lastEconomyUpdate: new Date()
            },
            $setOnInsert: {
              createdAt: new Date()
            }
          },
          { upsert: true }
        );

        if (result.upsertedCount > 0) created++;
        else if (result.modifiedCount > 0) updated++;
      }

      console.log(`[ECONOMY] Bulk sync: ${updated} updated, ${created} created`);

      res.json({ 
        success: true, 
        updated,
        created,
        total: players.length
      });
    } catch (error) {
      console.error('[ECONOMY] Sync error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Sync failed',
        message: error.message 
      });
    }
  });

  // ============================================
  // GET /api/economy/pending-sync/:uuid - Get pending transactions for player
  // Plugin polls this to sync web purchases (gacha) to in-game
  // ============================================
  router.get('/pending-sync/:uuid', async (req, res) => {
    try {
      const { uuid } = req.params;
      
      const pending = await getPendingSyncCollection()
        .find({ uuid, synced: false })
        .sort({ createdAt: 1 })
        .toArray();

      res.json({ 
        success: true, 
        pending,
        count: pending.length
      });
    } catch (error) {
      console.error('[ECONOMY] Error getting pending sync:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ============================================
  // POST /api/economy/pending-sync - Create pending sync (called by gacha)
  // ============================================
  router.post('/pending-sync', async (req, res) => {
    try {
      const { uuid, username, type, amount, reason, source } = req.body;
      
      if (!uuid || !type || typeof amount !== 'number') {
        return res.status(400).json({ 
          success: false, 
          error: 'uuid, type, and amount are required' 
        });
      }

      const pendingSync = {
        uuid,
        username: username || 'Unknown',
        type, // 'remove' for gacha purchases
        amount,
        reason: reason || 'Web transaction',
        source: source || 'web',
        synced: false,
        createdAt: new Date()
      };

      await getPendingSyncCollection().insertOne(pendingSync);
      
      console.log(`[ECONOMY] Pending sync created: ${type} ${amount} for ${username || uuid}`);

      res.json({ success: true, pendingSync });
    } catch (error) {
      console.error('[ECONOMY] Error creating pending sync:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ============================================
  // POST /api/economy/confirm-sync/:id - Mark pending sync as completed
  // Plugin calls this after executing the transaction in-game
  // ============================================
  router.post('/confirm-sync/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { ObjectId } = require('mongodb');
      
      const result = await getPendingSyncCollection().updateOne(
        { _id: new ObjectId(id) },
        { $set: { synced: true, syncedAt: new Date() } }
      );

      if (result.modifiedCount === 0) {
        return res.status(404).json({ success: false, error: 'Pending sync not found' });
      }

      console.log(`[ECONOMY] Sync confirmed: ${id}`);
      res.json({ success: true });
    } catch (error) {
      console.error('[ECONOMY] Error confirming sync:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  return router;
}

module.exports = { initEconomyRoutes };
