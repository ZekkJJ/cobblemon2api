/**
 * Pokemon Sync Routes
 * Bidirectional sync: DB changes -> In-game
 * Plugin polls this to detect Pokemon added/removed from DB
 */

const express = require('express');
const router = express.Router();
const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cobblemon';
const ADMIN_DISCORD_ID = '478742167557505034';

// Queue for pending Pokemon operations (plugin polls this)
// Format: { playerUuid, operation: 'ADD' | 'REMOVE', pokemon: {...} }
let pendingPokemonOperations = [];

// Track last known Pokemon state per player (for change detection)
let playerPokemonCache = new Map();

/**
 * GET /api/pokemon-sync/poll/:uuid
 * Plugin polls this to get pending Pokemon operations for a player
 */
router.get('/poll/:uuid', async (req, res) => {
  try {
    const { uuid } = req.params;
    
    // Get operations for this player
    const operations = pendingPokemonOperations.filter(op => op.playerUuid === uuid);
    
    // Remove processed operations from queue
    pendingPokemonOperations = pendingPokemonOperations.filter(op => op.playerUuid !== uuid);
    
    res.json({
      success: true,
      operations,
      count: operations.length
    });
  } catch (error) {
    console.error('[POKEMON-SYNC] Poll error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/pokemon-sync/poll-all
 * Plugin polls this to get ALL pending Pokemon operations
 */
router.get('/poll-all', async (req, res) => {
  try {
    // Return all pending operations and clear the queue
    const operations = [...pendingPokemonOperations];
    pendingPokemonOperations = [];
    
    res.json({
      success: true,
      operations,
      count: operations.length
    });
  } catch (error) {
    console.error('[POKEMON-SYNC] Poll-all error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/pokemon-sync/add
 * Admin adds a Pokemon to a player (from web panel)
 * This queues the operation for the plugin to process
 */
router.post('/add', async (req, res) => {
  try {
    const { adminDiscordId, playerUuid, pokemon } = req.body;
    
    // Verify admin
    if (adminDiscordId !== ADMIN_DISCORD_ID) {
      return res.status(403).json({ error: 'No autorizado' });
    }
    
    if (!playerUuid || !pokemon) {
      return res.status(400).json({ error: 'playerUuid y pokemon son requeridos' });
    }
    
    // Validate pokemon data
    if (!pokemon.species) {
      return res.status(400).json({ error: 'pokemon.species es requerido' });
    }
    
    const operation = {
      id: Date.now().toString(),
      playerUuid,
      operation: 'ADD',
      pokemon: {
        species: pokemon.species,
        level: pokemon.level || 5,
        shiny: pokemon.shiny || false,
        nature: pokemon.nature || 'hardy',
        ability: pokemon.ability || null,
        ivs: pokemon.ivs || { hp: 15, attack: 15, defense: 15, spAttack: 15, spDefense: 15, speed: 15 },
        evs: pokemon.evs || { hp: 0, attack: 0, defense: 0, spAttack: 0, spDefense: 0, speed: 0 },
        moves: pokemon.moves || [],
        heldItem: pokemon.heldItem || null,
        ball: pokemon.ball || 'poke_ball',
        form: pokemon.form || '',
      },
      createdAt: new Date().toISOString(),
      source: 'admin_panel'
    };
    
    pendingPokemonOperations.push(operation);
    console.log(`[POKEMON-SYNC] Queued ADD operation: ${pokemon.species} for ${playerUuid}`);
    
    res.json({
      success: true,
      operation,
      message: `Pokemon ${pokemon.species} será agregado cuando el jugador esté online`
    });
  } catch (error) {
    console.error('[POKEMON-SYNC] Add error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/pokemon-sync/remove
 * Admin removes a Pokemon from a player (from web panel)
 * This queues the operation for the plugin to process
 */
router.post('/remove', async (req, res) => {
  try {
    const { adminDiscordId, playerUuid, pokemonUuid, reason } = req.body;
    
    // Verify admin
    if (adminDiscordId !== ADMIN_DISCORD_ID) {
      return res.status(403).json({ error: 'No autorizado' });
    }
    
    if (!playerUuid || !pokemonUuid) {
      return res.status(400).json({ error: 'playerUuid y pokemonUuid son requeridos' });
    }
    
    const operation = {
      id: Date.now().toString(),
      playerUuid,
      operation: 'REMOVE',
      pokemonUuid,
      reason: reason || 'Removed by admin',
      createdAt: new Date().toISOString(),
      source: 'admin_panel'
    };
    
    pendingPokemonOperations.push(operation);
    console.log(`[POKEMON-SYNC] Queued REMOVE operation: ${pokemonUuid} from ${playerUuid}`);
    
    res.json({
      success: true,
      operation,
      message: `Pokemon será removido cuando el jugador esté online`
    });
  } catch (error) {
    console.error('[POKEMON-SYNC] Remove error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/pokemon-sync/detect-changes
 * Compare current DB state with cached state to detect manual DB changes
 * Called periodically by the backend or on-demand
 */
router.post('/detect-changes', async (req, res) => {
  let client;
  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db();
    
    // Get all players with Pokemon data
    const players = await db.collection('players').find({
      $or: [
        { 'party': { $exists: true, $ne: [] } },
        { 'pcStorage': { $exists: true, $ne: [] } }
      ]
    }).toArray();
    
    let changesDetected = 0;
    
    for (const player of players) {
      const uuid = player.uuid;
      if (!uuid) continue;
      
      // Get current Pokemon UUIDs from DB
      const currentPokemonUuids = new Set();
      
      // From party
      if (player.party && Array.isArray(player.party)) {
        player.party.forEach(p => {
          if (p && p.uuid) currentPokemonUuids.add(p.uuid);
        });
      }
      
      // From PC
      if (player.pcStorage && Array.isArray(player.pcStorage)) {
        player.pcStorage.forEach(box => {
          if (box && box.pokemon && Array.isArray(box.pokemon)) {
            box.pokemon.forEach(p => {
              if (p && p.uuid) currentPokemonUuids.add(p.uuid);
            });
          }
        });
      }
      
      // Compare with cached state
      const cachedUuids = playerPokemonCache.get(uuid) || new Set();
      
      // Find removed Pokemon (in cache but not in current)
      for (const pokemonUuid of cachedUuids) {
        if (!currentPokemonUuids.has(pokemonUuid)) {
          // Pokemon was removed from DB manually
          pendingPokemonOperations.push({
            id: Date.now().toString() + '_' + pokemonUuid,
            playerUuid: uuid,
            operation: 'REMOVE',
            pokemonUuid,
            reason: 'Removed from database manually',
            createdAt: new Date().toISOString(),
            source: 'db_change_detection'
          });
          changesDetected++;
          console.log(`[POKEMON-SYNC] Detected manual removal: ${pokemonUuid} from ${uuid}`);
        }
      }
      
      // Find added Pokemon (in current but not in cache)
      for (const pokemonUuid of currentPokemonUuids) {
        if (!cachedUuids.has(pokemonUuid)) {
          // Pokemon was added to DB manually - find the full data
          let pokemonData = null;
          
          // Search in party
          if (player.party) {
            pokemonData = player.party.find(p => p && p.uuid === pokemonUuid);
          }
          
          // Search in PC if not found
          if (!pokemonData && player.pcStorage) {
            for (const box of player.pcStorage) {
              if (box && box.pokemon) {
                pokemonData = box.pokemon.find(p => p && p.uuid === pokemonUuid);
                if (pokemonData) break;
              }
            }
          }
          
          if (pokemonData) {
            pendingPokemonOperations.push({
              id: Date.now().toString() + '_' + pokemonUuid,
              playerUuid: uuid,
              operation: 'ADD',
              pokemon: pokemonData,
              createdAt: new Date().toISOString(),
              source: 'db_change_detection'
            });
            changesDetected++;
            console.log(`[POKEMON-SYNC] Detected manual addition: ${pokemonData.species} to ${uuid}`);
          }
        }
      }
      
      // Update cache
      playerPokemonCache.set(uuid, currentPokemonUuids);
    }
    
    res.json({
      success: true,
      changesDetected,
      pendingOperations: pendingPokemonOperations.length
    });
  } catch (error) {
    console.error('[POKEMON-SYNC] Detect changes error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    if (client) await client.close();
  }
});

/**
 * POST /api/pokemon-sync/confirm
 * Plugin confirms an operation was processed
 */
router.post('/confirm', async (req, res) => {
  try {
    const { operationId, success, error } = req.body;
    
    if (!operationId) {
      return res.status(400).json({ error: 'operationId es requerido' });
    }
    
    // Remove from pending queue
    const index = pendingPokemonOperations.findIndex(op => op.id === operationId);
    if (index !== -1) {
      const operation = pendingPokemonOperations.splice(index, 1)[0];
      console.log(`[POKEMON-SYNC] Operation ${operationId} confirmed: ${success ? 'SUCCESS' : 'FAILED'}`);
      
      if (!success && error) {
        console.error(`[POKEMON-SYNC] Operation failed: ${error}`);
      }
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('[POKEMON-SYNC] Confirm error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/pokemon-sync/queue-status
 * Get current queue status (for admin panel)
 */
router.get('/queue-status', (req, res) => {
  res.json({
    success: true,
    pendingOperations: pendingPokemonOperations.length,
    operations: pendingPokemonOperations.map(op => ({
      id: op.id,
      playerUuid: op.playerUuid,
      operation: op.operation,
      species: op.pokemon?.species || null,
      pokemonUuid: op.pokemonUuid || null,
      source: op.source,
      createdAt: op.createdAt
    }))
  });
});

module.exports = router;
