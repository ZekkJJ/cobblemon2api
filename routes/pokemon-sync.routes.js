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

/**
 * GET /api/pokemon-sync/version
 * Debug endpoint to verify routes are loaded with latest code
 */
router.get('/version', (req, res) => {
  res.json({
    success: true,
    version: '2.0.1',
    features: ['poll', 'add', 'remove', 'smart-remove-duplicates', 'bulk-remove'],
    loadedAt: new Date().toISOString()
  });
});

/**
 * GET /api/pokemon-sync/test-duplicates/:discordId
 * Test endpoint to verify the route works (GET version for debugging)
 */
router.get('/test-duplicates/:discordId', async (req, res) => {
  console.log('[POKEMON-SYNC] test-duplicates GET called for:', req.params.discordId);
  let client;
  try {
    const { discordId } = req.params;
    
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db();
    
    const player = await db.collection('players').findOne({ discordId });
    
    if (!player) {
      return res.status(404).json({ error: 'Jugador no encontrado', discordId });
    }
    
    res.json({
      success: true,
      playerFound: true,
      uuid: player.uuid,
      username: player.username,
      partyCount: player.party?.length || 0,
      pcBoxes: player.pcStorage?.length || 0
    });
  } catch (error) {
    console.error('[POKEMON-SYNC] test-duplicates error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    if (client) await client.close();
  }
});

/**
 * POST /api/pokemon-sync/smart-remove-duplicates
 * Intelligently remove duplicate Pokemon, keeping the best one of each species
 * Criteria: Higher IVs > Higher Level > Shiny > Protected
 */
router.post('/smart-remove-duplicates', async (req, res) => {
  console.log('[POKEMON-SYNC] ========================================');
  console.log('[POKEMON-SYNC] smart-remove-duplicates POST received');
  console.log('[POKEMON-SYNC] Body:', JSON.stringify(req.body));
  console.log('[POKEMON-SYNC] Headers:', JSON.stringify(req.headers));
  let client;
  try {
    const { discordId, playerUuid, dryRun = true } = req.body;
    
    console.log('[POKEMON-SYNC] Parsed: discordId=', discordId, 'playerUuid=', playerUuid, 'dryRun=', dryRun);
    
    if (!discordId && !playerUuid) {
      console.log('[POKEMON-SYNC] ERROR: Missing discordId and playerUuid');
      return res.status(400).json({ error: 'discordId o playerUuid es requerido' });
    }
    
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('[POKEMON-SYNC] Connected to MongoDB');
    const db = client.db();
    
    // Find player - try 'users' collection first (where pokebox data is stored)
    const query = playerUuid ? { uuid: playerUuid } : { discordId };
    console.log('[POKEMON-SYNC] Query:', JSON.stringify(query));
    
    // Try users collection first
    let player = await db.collection('users').findOne(query);
    
    // If not found in users, try players collection
    if (!player) {
      console.log('[POKEMON-SYNC] Not found in users, trying players collection...');
      player = await db.collection('players').findOne(query);
    }
    
    if (!player) {
      console.log('[POKEMON-SYNC] ERROR: Player not found in users or players');
      return res.status(404).json({ error: 'Jugador no encontrado' });
    }
    
    console.log('[POKEMON-SYNC] Found player:', player.username || player.discordUsername, player.uuid);
    
    // ============================================
    // HELPER FUNCTIONS (same as tutorias)
    // ============================================
    
    // Normalize stats - handle different formats
    const normalizeStats = (stats) => {
      if (!stats) return { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 };
      return {
        hp: stats.hp ?? stats.HP ?? stats.Hp ?? 0,
        attack: stats.attack ?? stats.Attack ?? stats.atk ?? stats.ATK ?? 0,
        defense: stats.defense ?? stats.Defense ?? stats.def ?? stats.DEF ?? 0,
        specialAttack: stats.specialAttack ?? stats.spAttack ?? stats.special_attack ?? stats.SpAtk ?? stats.spAtk ?? stats.spa ?? 0,
        specialDefense: stats.specialDefense ?? stats.spDefense ?? stats.special_defense ?? stats.SpDef ?? stats.spDef ?? stats.spd ?? 0,
        speed: stats.speed ?? stats.Speed ?? stats.spe ?? stats.SPE ?? 0
      };
    };
    
    // Normalize Pokemon data
    const normalizePokemon = (p, location, boxIndex = null, slotIndex = null) => {
      if (!p) return null;
      
      const ivs = normalizeStats(p.ivs);
      const evs = normalizeStats(p.evs);
      
      const ivTotal = ivs.hp + ivs.attack + ivs.defense + ivs.specialAttack + ivs.specialDefense + ivs.speed;
      const ivPercentage = (ivTotal / 186) * 100;
      
      return {
        uuid: p.uuid || p.id || `pokemon-${Date.now()}-${Math.random()}`,
        species: p.species || p.name || 'Unknown',
        nickname: p.nickname || null,
        level: p.level || 1,
        nature: p.nature || 'Hardy',
        ability: p.ability || 'Unknown',
        ivs,
        evs,
        ivPercentage,
        shiny: p.shiny === true || p.isShiny === true,
        isProtected: p.protected === true || p.isProtected === true,
        location,
        boxIndex,
        slotIndex
      };
    };
    
    // Extract Pokemon from pcStorage (handles different formats)
    const extractPokemonFromStorage = (pcStorage) => {
      if (!Array.isArray(pcStorage)) return [];
      
      const allPokemon = [];
      
      for (const item of pcStorage) {
        // Check if it's a box structure { boxNumber, pokemon: [...] }
        if (item && Array.isArray(item.pokemon)) {
          item.pokemon.forEach((p, slotIndex) => {
            if (p) allPokemon.push({ pokemon: p, boxIndex: item.boxNumber || 0, slotIndex });
          });
        } 
        // Check if it's a direct Pokemon object (has species or uuid)
        else if (item && (item.species || item.uuid || item.name)) {
          allPokemon.push({ pokemon: item, boxIndex: 0, slotIndex: allPokemon.length });
        }
      }
      
      return allPokemon;
    };
    
    // ============================================
    // COLLECT ALL POKEMON
    // ============================================
    
    const allPokemon = [];
    
    // Debug: log raw data structure - check both field names
    const partyData = player.party || player.pokemonParty || [];
    const pcData = player.pcStorage || player.pokemonPcStorage || [];
    
    console.log('[POKEMON-SYNC] party field:', player.party ? `${player.party.length} items` : 'undefined');
    console.log('[POKEMON-SYNC] pokemonParty field:', player.pokemonParty ? `${player.pokemonParty.length} items` : 'undefined');
    console.log('[POKEMON-SYNC] pcStorage field:', player.pcStorage ? `${player.pcStorage.length} items` : 'undefined');
    console.log('[POKEMON-SYNC] Using partyData length:', partyData.length);
    console.log('[POKEMON-SYNC] Using pcData length:', pcData.length);
    
    // From party (check both field names)
    if (partyData && Array.isArray(partyData)) {
      partyData.forEach((p, index) => {
        const normalized = normalizePokemon(p, 'party', null, index);
        if (normalized && normalized.species !== 'Unknown') {
          allPokemon.push(normalized);
        }
      });
    }
    
    // From PC storage
    const pcPokemon = extractPokemonFromStorage(pcData);
    pcPokemon.forEach(({ pokemon, boxIndex, slotIndex }) => {
      const normalized = normalizePokemon(pokemon, 'pc', boxIndex, slotIndex);
      if (normalized && normalized.species !== 'Unknown') {
        allPokemon.push(normalized);
      }
    });
    
    console.log('[POKEMON-SYNC] Total pokemon collected:', allPokemon.length);
    if (allPokemon.length > 0) {
      console.log('[POKEMON-SYNC] Sample species:', allPokemon.slice(0, 5).map(p => p.species).join(', '));
    }
    
    // Group by species
    const speciesGroups = {};
    allPokemon.forEach(p => {
      const species = p.species.toLowerCase();
      if (!speciesGroups[species]) {
        speciesGroups[species] = [];
      }
      speciesGroups[species].push(p);
    });
    
    console.log('[POKEMON-SYNC] Unique species:', Object.keys(speciesGroups).length);
    
    // Score Pokemon for comparison (higher = better)
    const scorePokemon = (p) => {
      let score = 0;
      
      // IV percentage (0-100 points)
      score += p.ivPercentage || 0;
      
      // Level (0-100 points)
      score += (p.level || 1);
      
      // Shiny bonus (50 points)
      if (p.shiny) score += 50;
      
      // Protected bonus (1000 points - never remove protected)
      if (p.isProtected) score += 1000;
      
      // Party bonus (10 points - prefer keeping party Pokemon)
      if (p.location === 'party') score += 10;
      
      return score;
    };
    
    // Find duplicates to remove
    const toRemove = [];
    const toKeep = [];
    
    for (const [species, group] of Object.entries(speciesGroups)) {
      if (group.length <= 1) {
        // No duplicates
        toKeep.push(...group);
        continue;
      }
      
      // Sort by score (highest first)
      group.sort((a, b) => scorePokemon(b) - scorePokemon(a));
      
      // Keep the best one
      const best = group[0];
      toKeep.push(best);
      
      // Mark others for removal (except protected ones)
      for (let i = 1; i < group.length; i++) {
        const pokemon = group[i];
        if (pokemon.isProtected) {
          toKeep.push(pokemon);
        } else {
          toRemove.push({
            uuid: pokemon.uuid,
            species: pokemon.species,
            level: pokemon.level,
            ivPercentage: (pokemon.ivPercentage || 0).toFixed(1),
            shiny: pokemon.shiny || false,
            location: pokemon.location,
            reason: `Duplicate of ${best.species} (kept: Lv.${best.level}, ${(best.ivPercentage || 0).toFixed(1)}% IVs)`
          });
        }
      }
    }
    
    // If dry run, just return what would be removed
    if (dryRun) {
      console.log('[POKEMON-SYNC] DRY RUN - returning preview');
      console.log('[POKEMON-SYNC] toRemove count:', toRemove.length);
      const response = {
        success: true,
        dryRun: true,
        summary: {
          totalPokemon: allPokemon.length,
          uniqueSpecies: Object.keys(speciesGroups).length,
          duplicatesFound: toRemove.length,
          wouldKeep: toKeep.length
        },
        toRemove,
        message: `Se encontraron ${toRemove.length} duplicados que serían eliminados`
      };
      console.log('[POKEMON-SYNC] Sending response:', JSON.stringify(response).substring(0, 500));
      return res.json(response);
    }
    
    // Actually queue the removals
    const queuedOperations = [];
    for (const pokemon of toRemove) {
      const operation = {
        id: Date.now().toString() + '_' + pokemon.uuid,
        playerUuid: player.uuid,
        operation: 'REMOVE',
        pokemonUuid: pokemon.uuid,
        reason: `Smart duplicate removal: ${pokemon.reason}`,
        createdAt: new Date().toISOString(),
        source: 'smart_duplicate_removal'
      };
      
      pendingPokemonOperations.push(operation);
      queuedOperations.push(operation);
    }
    
    console.log(`[POKEMON-SYNC] Smart duplicate removal: Queued ${queuedOperations.length} removals for ${player.uuid}`);
    
    res.json({
      success: true,
      dryRun: false,
      summary: {
        totalPokemon: allPokemon.length,
        uniqueSpecies: Object.keys(speciesGroups).length,
        duplicatesRemoved: toRemove.length,
        kept: toKeep.length
      },
      removed: toRemove,
      queuedOperations: queuedOperations.length,
      message: `${toRemove.length} duplicados serán eliminados cuando el jugador esté online`
    });
  } catch (error) {
    console.error('[POKEMON-SYNC] Smart remove duplicates error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    if (client) await client.close();
  }
});

/**
 * POST /api/pokemon-sync/bulk-remove
 * Remove multiple Pokemon at once (for user-selected removal)
 */
router.post('/bulk-remove', async (req, res) => {
  try {
    const { discordId, playerUuid, pokemonUuids, reason } = req.body;
    
    if (!discordId && !playerUuid) {
      return res.status(400).json({ error: 'discordId o playerUuid es requerido' });
    }
    
    if (!pokemonUuids || !Array.isArray(pokemonUuids) || pokemonUuids.length === 0) {
      return res.status(400).json({ error: 'pokemonUuids array es requerido' });
    }
    
    const targetUuid = playerUuid || discordId;
    const queuedOperations = [];
    
    for (const pokemonUuid of pokemonUuids) {
      const operation = {
        id: Date.now().toString() + '_' + pokemonUuid,
        playerUuid: targetUuid,
        operation: 'REMOVE',
        pokemonUuid,
        reason: reason || 'Bulk removal by user',
        createdAt: new Date().toISOString(),
        source: 'bulk_removal'
      };
      
      pendingPokemonOperations.push(operation);
      queuedOperations.push(operation);
    }
    
    console.log(`[POKEMON-SYNC] Bulk removal: Queued ${queuedOperations.length} removals for ${targetUuid}`);
    
    res.json({
      success: true,
      queuedOperations: queuedOperations.length,
      message: `${queuedOperations.length} Pokemon serán eliminados cuando estés online`
    });
  } catch (error) {
    console.error('[POKEMON-SYNC] Bulk remove error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
