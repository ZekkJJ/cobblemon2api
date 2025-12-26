/**
 * Pokemon Gacha Routes (JavaScript)
 * Cobblemon Los Pitufos - Backend API
 * 
 * Sistema de gacha estilo Genshin Impact
 * Usando precisión decimal alta (10^8) para cálculos de probabilidad
 */

const express = require('express');
const crypto = require('crypto');

// ============================================
// CONFIGURACIÓN DEL GACHA
// ============================================

const PULL_COSTS = { single: 500, multi: 4500 };
const SHINY_RATE = 1 / 4096;
const SOFT_PITY_START = 75;
const HARD_PITY = 90;
const SOFT_PITY_INCREASE = 0.05;

// Precisión decimal: usamos enteros multiplicados por 10^8 para evitar errores de punto flotante
const PRECISION = 100000000; // 10^8

// Probabilidades base por rareza (en formato de alta precisión)
// MEGA NERFED - Pseudos y Legendarios son CASI IMPOSIBLES
// common=65%, uncommon=30%, rare=4.5%, epic=0.49%, legendary=0.009%, mythic=0.001%
const BASE_RATES_PRECISE = {
  common:    65000000,  // 65.000000%
  uncommon:  30000000,  // 30.000000%
  rare:       4500000,  //  4.500000%
  epic:        490000,  //  0.490000% (1 en 204 - pseudos MUY raros)
  legendary:     9000,  //  0.009000% (1 en 11,111 - casi imposible)
  mythic:        1000,  //  0.001000% (1 en 100,000 - extremadamente raro)
};

// Convertir a decimales para compatibilidad
const BASE_RATES = {
  common: BASE_RATES_PRECISE.common / PRECISION,
  uncommon: BASE_RATES_PRECISE.uncommon / PRECISION,
  rare: BASE_RATES_PRECISE.rare / PRECISION,
  epic: BASE_RATES_PRECISE.epic / PRECISION,
  legendary: BASE_RATES_PRECISE.legendary / PRECISION,
  mythic: BASE_RATES_PRECISE.mythic / PRECISION,
};

// Bonus de probabilidad para featured pokemon (+3% sobre su rareza base)
const FEATURED_BONUS = 0.03;

// Pool de Pokémon por rareza
const POKEMON_POOL = {
  common: [
    { pokemonId: 19, name: 'Rattata', types: ['normal'] },
    { pokemonId: 16, name: 'Pidgey', types: ['normal', 'flying'] },
    { pokemonId: 10, name: 'Caterpie', types: ['bug'] },
    { pokemonId: 13, name: 'Weedle', types: ['bug', 'poison'] },
    { pokemonId: 41, name: 'Zubat', types: ['poison', 'flying'] },
  ],
  uncommon: [
    { pokemonId: 25, name: 'Pikachu', types: ['electric'] },
    { pokemonId: 133, name: 'Eevee', types: ['normal'] },
    { pokemonId: 37, name: 'Vulpix', types: ['fire'] },
    { pokemonId: 58, name: 'Growlithe', types: ['fire'] },
    { pokemonId: 147, name: 'Dratini', types: ['dragon'] },
  ],
  rare: [
    { pokemonId: 131, name: 'Lapras', types: ['water', 'ice'] },
    { pokemonId: 143, name: 'Snorlax', types: ['normal'] },
    { pokemonId: 149, name: 'Dragonite', types: ['dragon', 'flying'] },
    { pokemonId: 130, name: 'Gyarados', types: ['water', 'flying'] },
    { pokemonId: 6, name: 'Charizard', types: ['fire', 'flying'] },
  ],
  epic: [
    { pokemonId: 248, name: 'Tyranitar', types: ['rock', 'dark'] },
    { pokemonId: 373, name: 'Salamence', types: ['dragon', 'flying'] },
    { pokemonId: 376, name: 'Metagross', types: ['steel', 'psychic'] },
    { pokemonId: 445, name: 'Garchomp', types: ['dragon', 'ground'] },
    { pokemonId: 635, name: 'Hydreigon', types: ['dark', 'dragon'] },
  ],
  legendary: [
    { pokemonId: 144, name: 'Articuno', types: ['ice', 'flying'] },
    { pokemonId: 145, name: 'Zapdos', types: ['electric', 'flying'] },
    { pokemonId: 146, name: 'Moltres', types: ['fire', 'flying'] },
    { pokemonId: 150, name: 'Mewtwo', types: ['psychic'] },
    { pokemonId: 249, name: 'Lugia', types: ['psychic', 'flying'] },
    { pokemonId: 250, name: 'Ho-Oh', types: ['fire', 'flying'] },
    { pokemonId: 384, name: 'Rayquaza', types: ['dragon', 'flying'] },
  ],
  mythic: [
    { pokemonId: 151, name: 'Mew', types: ['psychic'] },
    { pokemonId: 251, name: 'Celebi', types: ['psychic', 'grass'] },
    { pokemonId: 385, name: 'Jirachi', types: ['steel', 'psychic'] },
    { pokemonId: 493, name: 'Arceus', types: ['normal'] },
  ],
};

// Pool de Items por rareza
const ITEM_POOL = {
  rare: [
    { itemId: 'cobblemon:safari_ball', name: 'Safari Ball', quantity: 3 },
    { itemId: 'cobblemon:sport_ball', name: 'Sport Ball', quantity: 3 },
  ],
  epic: [
    { itemId: 'cobblemon:dream_ball', name: 'Dream Ball', quantity: 2 },
    { itemId: 'cobblemon:beast_ball', name: 'Beast Ball', quantity: 1 },
  ],
  legendary: [
    { itemId: 'cobblemon:master_ball', name: 'Master Ball', quantity: 1 },
  ],
};

// ============================================
// FUNCIONES HELPER
// ============================================

function generateUUID() {
  return crypto.randomUUID();
}

function randomFloat() {
  return crypto.randomBytes(4).readUInt32BE() / 0xFFFFFFFF;
}

function randomInt(min, max) {
  return Math.floor(randomFloat() * (max - min + 1)) + min;
}

function chance(probability) {
  return randomFloat() < probability;
}

function weightedSelect(items, weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  let random = randomFloat() * total;
  for (let i = 0; i < items.length; i++) {
    random -= weights[i];
    if (random <= 0) return items[i];
  }
  return items[items.length - 1];
}

function generateIVs(rarity) {
  const ranges = {
    common: [0, 15],
    uncommon: [5, 20],
    rare: [10, 25],
    epic: [15, 28],
    legendary: [20, 30],
    mythic: [25, 31],
  };
  const [min, max] = ranges[rarity] || [0, 31];
  return {
    hp: randomInt(min, max),
    atk: randomInt(min, max),
    def: randomInt(min, max),
    spa: randomInt(min, max),
    spd: randomInt(min, max),
    spe: randomInt(min, max),
  };
}

function getPokemonSprite(pokemonId, isShiny = false) {
  const base = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';
  return isShiny ? `${base}/shiny/${pokemonId}.png` : `${base}/${pokemonId}.png`;
}

// ============================================
// SERVICIO DE GACHA
// ============================================

class PokemonGachaService {
  constructor(db) {
    this.db = db;
    this.bannersCollection = db.collection('gacha_banners');
    this.historyCollection = db.collection('gacha_history');
    this.pityCollection = db.collection('gacha_pity');
    this.pendingCollection = db.collection('gacha_pending');
  }

  async ensureIndexes() {
    try {
      await this.bannersCollection.createIndex({ bannerId: 1 }, { unique: true });
      await this.historyCollection.createIndex({ playerId: 1, pulledAt: -1 });
      await this.pityCollection.createIndex({ playerId: 1, bannerId: 1 }, { unique: true });
      await this.pendingCollection.createIndex({ playerUuid: 1, status: 1 });
      await this.pendingCollection.createIndex({ rewardId: 1 }, { unique: true });
      console.log('[POKEMON GACHA] Índices creados');
    } catch (e) {
      console.error('[POKEMON GACHA] Error creando índices:', e.message);
    }
  }

  async ensureStandardBanner() {
    const exists = await this.bannersCollection.findOne({ bannerId: 'standard' });
    if (!exists) {
      await this.bannersCollection.insertOne({
        bannerId: 'standard',
        name: 'Standard Banner',
        nameEs: 'Banner Estándar',
        description: 'The permanent banner with all available Pokémon',
        descriptionEs: 'El banner permanente con todos los Pokémon disponibles. ¡Tira para obtener Pokémon de todas las rarezas!',
        type: 'standard',
        isActive: true,
        artwork: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png',
        singlePullCost: PULL_COSTS.single,
        multiPullCost: PULL_COSTS.multi,
        featuredPokemon: [],
        featuredItems: [],
        createdAt: new Date(),
      });
      console.log('[POKEMON GACHA] Banner estándar creado');
    } else if (!exists.artwork) {
      // Update existing banner with artwork if missing
      await this.bannersCollection.updateOne(
        { bannerId: 'standard' },
        { 
          $set: { 
            artwork: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png',
            descriptionEs: 'El banner permanente con todos los Pokémon disponibles. ¡Tira para obtener Pokémon de todas las rarezas!',
          } 
        }
      );
      console.log('[POKEMON GACHA] Banner estándar actualizado con artwork');
    }
  }

  async getPityCount(playerId, bannerId) {
    const pity = await this.pityCollection.findOne({ playerId, bannerId });
    return pity?.currentPity || 0;
  }

  async incrementPity(playerId, bannerId) {
    await this.pityCollection.updateOne(
      { playerId, bannerId },
      { $inc: { currentPity: 1 }, $set: { updatedAt: new Date() } },
      { upsert: true }
    );
  }

  async resetPity(playerId, bannerId) {
    await this.pityCollection.updateOne(
      { playerId, bannerId },
      { $set: { currentPity: 0, updatedAt: new Date() } },
      { upsert: true }
    );
  }

  // Selección de rareza con precisión decimal alta (10^8)
  selectRarityPrecise(pityCount, featuredPokemon = []) {
    // Usar enteros para evitar errores de punto flotante
    const rates = { ...BASE_RATES_PRECISE };
    
    // Hard pity garantiza epic
    if (pityCount >= HARD_PITY) {
      return 'epic';
    }
    
    // Soft pity aumenta probabilidad de epic
    if (pityCount >= SOFT_PITY_START) {
      const bonusPrecise = Math.floor((pityCount - SOFT_PITY_START) * SOFT_PITY_INCREASE * PRECISION);
      rates.epic = Math.min(rates.epic + bonusPrecise, PRECISION);
    }

    // Agregar bonus de featured (+3% a la rareza de cada featured)
    for (const featured of featuredPokemon) {
      if (rates[featured.rarity] !== undefined) {
        const bonusPrecise = Math.floor(FEATURED_BONUS * PRECISION);
        rates[featured.rarity] = Math.min(rates[featured.rarity] + bonusPrecise, Math.floor(0.5 * PRECISION));
      }
    }

    // Generar número aleatorio con precisión alta usando crypto
    const randomBytes = crypto.randomBytes(8);
    const randomBigInt = randomBytes.readBigUInt64BE();
    const roll = Number(randomBigInt % BigInt(PRECISION));
    
    let cumulative = 0;
    
    // Orden de rareza de más raro a más común para precisión
    const rarityOrder = ['mythic', 'legendary', 'epic', 'rare', 'uncommon', 'common'];
    
    for (const rarity of rarityOrder) {
      cumulative += rates[rarity];
      if (roll < cumulative) return rarity;
    }
    
    return 'common';
  }

  selectRarity(pityCount) {
    return this.selectRarityPrecise(pityCount, []);
  }

  selectReward(rarity, featuredPokemon = []) {
    // 80% Pokémon, 20% Items (solo para rare+)
    const isItem = ['rare', 'epic', 'legendary'].includes(rarity) && 
                   ITEM_POOL[rarity] && 
                   chance(0.2);

    if (isItem) {
      const items = ITEM_POOL[rarity];
      const item = items[randomInt(0, items.length - 1)];
      return { type: 'item', data: item, rarity, isFeatured: false };
    }

    // Verificar si hay featured pokemon de esta rareza
    const featuredOfRarity = featuredPokemon.filter(f => f.rarity === rarity);
    
    // Si hay featured de esta rareza, 50% de chance de obtener uno de ellos
    if (featuredOfRarity.length > 0 && chance(0.5)) {
      const featured = featuredOfRarity[randomInt(0, featuredOfRarity.length - 1)];
      return { 
        type: 'pokemon', 
        data: { 
          pokemonId: featured.pokemonId, 
          name: featured.name, 
          types: featured.types || ['normal'] 
        }, 
        rarity,
        isFeatured: true 
      };
    }

    const pokemon = POKEMON_POOL[rarity] || POKEMON_POOL.common;
    const selected = pokemon[randomInt(0, pokemon.length - 1)];
    return { type: 'pokemon', data: selected, rarity, isFeatured: false };
  }

  async executePull(playerId, playerUuid, bannerId) {
    // Obtener banner para featured pokemon
    const banner = await this.getBanner(bannerId);
    const featuredPokemon = banner?.featuredPokemon || [];
    
    const pityCount = await this.getPityCount(playerId, bannerId);
    // Usar la función de precisión alta
    const rarity = this.selectRarityPrecise(pityCount, featuredPokemon);
    const selected = this.selectReward(rarity, featuredPokemon);
    const isShiny = selected.type === 'pokemon' && chance(SHINY_RATE);
    const rewardId = generateUUID();

    const reward = {
      rewardId,
      playerId,
      bannerId,
      type: selected.type,
      rarity: selected.rarity,
      isShiny,
      isFeatured: selected.isFeatured || false,
      status: 'pending',
      pulledAt: new Date(),
    };

    if (selected.type === 'pokemon') {
      const ivs = generateIVs(rarity);
      reward.pokemon = {
        pokemonId: selected.data.pokemonId,
        name: selected.data.name,
        level: 1,
        isShiny,
        ivs,
        nature: 'hardy',
        types: selected.data.types,
        sprite: getPokemonSprite(selected.data.pokemonId, isShiny),
      };
    } else {
      reward.item = {
        itemId: selected.data.itemId,
        name: selected.data.name,
        quantity: selected.data.quantity,
      };
    }

    // Actualizar pity
    if (['epic', 'legendary', 'mythic'].includes(rarity)) {
      await this.resetPity(playerId, bannerId);
    } else {
      await this.incrementPity(playerId, bannerId);
    }

    // Guardar historial
    await this.historyCollection.insertOne({
      playerId,
      bannerId,
      reward,
      rarity,
      isShiny,
      pityAtPull: pityCount,
      cost: PULL_COSTS.single,
      pulledAt: new Date(),
    });

    // Crear entrega pendiente
    await this.pendingCollection.insertOne({
      rewardId,
      playerId,
      playerUuid,
      type: reward.type,
      pokemon: reward.pokemon,
      item: reward.item,
      rarity,
      isShiny,
      status: 'pending',
      deliveryAttempts: 0,
      createdAt: new Date(),
    });

    return reward;
  }

  async pull(playerId, playerUuid, bannerId, usersCollection) {
    // Verificar balance
    const user = await usersCollection.findOne({ discordId: playerId });
    if (!user) throw new Error('Jugador no encontrado');
    
    // IMPORTANTE: Usar el balance correcto - cobbleDollars es el campo principal
    // cobbleDollarsBalance puede estar desincronizado, usar el mayor de los dos
    const balanceA = Number(user.cobbleDollars) || 0;
    const balanceB = Number(user.cobbleDollarsBalance) || 0;
    const balance = Math.max(balanceA, balanceB);
    const cost = Number(PULL_COSTS.single);
    
    console.log('[GACHA DEBUG] cobbleDollars:', balanceA, 'cobbleDollarsBalance:', balanceB, 'Using:', balance, 'Cost:', cost);
    
    if (balance < cost) {
      throw new Error(`Balance insuficiente. Necesitas ${cost} CD`);
    }

    // Deducir balance
    await usersCollection.updateOne(
      { discordId: playerId },
      { $inc: { cobbleDollarsBalance: -cost, cobbleDollars: -cost } }
    );

    const reward = await this.executePull(playerId, playerUuid, bannerId);
    const newBalance = balance - cost;

    return {
      success: true,
      reward,
      newBalance,
      pityStatus: { currentPity: await this.getPityCount(playerId, bannerId), softPityStart: SOFT_PITY_START, hardPity: HARD_PITY },
    };
  }

  async multiPull(playerId, playerUuid, bannerId, usersCollection) {
    const user = await usersCollection.findOne({ discordId: playerId });
    if (!user) throw new Error('Jugador no encontrado');
    
    // IMPORTANTE: Usar el balance correcto - cobbleDollars es el campo principal
    // cobbleDollarsBalance puede estar desincronizado, usar el mayor de los dos
    const balanceA = Number(user.cobbleDollars) || 0;
    const balanceB = Number(user.cobbleDollarsBalance) || 0;
    const balance = Math.max(balanceA, balanceB);
    const cost = Number(PULL_COSTS.multi);
    
    console.log('[GACHA DEBUG] Multi-pull cobbleDollars:', balanceA, 'cobbleDollarsBalance:', balanceB, 'Using:', balance, 'Cost:', cost);
    
    if (balance < cost) {
      throw new Error(`Balance insuficiente. Necesitas ${cost} CD`);
    }

    await usersCollection.updateOne(
      { discordId: playerId },
      { $inc: { cobbleDollarsBalance: -cost, cobbleDollars: -cost } }
    );

    const rewards = [];
    for (let i = 0; i < 10; i++) {
      const reward = await this.executePull(playerId, playerUuid, bannerId);
      rewards.push(reward);
    }

    const newBalance = balance - cost;
    const highlights = {
      epicOrBetter: rewards.filter(r => ['epic', 'legendary', 'mythic'].includes(r.rarity)).length,
      shinies: rewards.filter(r => r.isShiny).length,
    };

    return {
      success: true,
      rewards,
      newBalance,
      pityStatus: { currentPity: await this.getPityCount(playerId, bannerId), softPityStart: SOFT_PITY_START, hardPity: HARD_PITY },
      highlights,
    };
  }

  async getActiveBanners() {
    return await this.bannersCollection.find({ isActive: true }).toArray();
  }

  async getBanner(bannerId) {
    return await this.bannersCollection.findOne({ bannerId });
  }

  async getPendingRewards(playerUuid) {
    return await this.pendingCollection.find({ playerUuid, status: 'pending' }).toArray();
  }

  async claimReward(rewardId) {
    const result = await this.pendingCollection.updateOne(
      { rewardId, status: 'pending' },
      { $set: { status: 'claimed', claimedAt: new Date() } }
    );
    return result.modifiedCount > 0;
  }

  async markDeliveryFailed(rewardId, reason) {
    await this.pendingCollection.updateOne(
      { rewardId },
      { $set: { status: 'failed', failureReason: reason }, $inc: { deliveryAttempts: 1 } }
    );
  }

  async getHistory(playerId, limit = 100) {
    return await this.historyCollection
      .find({ playerId })
      .sort({ pulledAt: -1 })
      .limit(limit)
      .toArray();
  }

  async getStats(playerId) {
    const history = await this.historyCollection.find({ playerId }).toArray();
    const stats = {
      totalPulls: history.length,
      totalSpent: history.reduce((sum, h) => sum + (h.cost || 0), 0),
      rarityDistribution: { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0, mythic: 0 },
      shinyCount: 0,
    };
    for (const h of history) {
      stats.rarityDistribution[h.rarity]++;
      if (h.isShiny) stats.shinyCount++;
    }
    return stats;
  }
}

// ============================================
// INICIALIZACIÓN DE RUTAS
// ============================================

let gachaService = null;

function initPokemonGachaRoutes(app, db, usersCollection) {
  gachaService = new PokemonGachaService(db);
  gachaService.ensureIndexes();
  gachaService.ensureStandardBanner();

  const router = express.Router();

  // GET /api/pokemon-gacha/banners - Obtener banners activos
  router.get('/banners', async (req, res) => {
    try {
      const banners = await gachaService.getActiveBanners();
      res.json({ success: true, banners });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // GET /api/pokemon-gacha/banners/:id
  router.get('/banners/:id', async (req, res) => {
    try {
      const banner = await gachaService.getBanner(req.params.id);
      if (!banner) return res.status(404).json({ success: false, error: 'Banner no encontrado' });
      res.json({ success: true, banner });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // POST /api/pokemon-gacha/pull - Tirada simple
  router.post('/pull', async (req, res) => {
    try {
      const { playerId, discordId, bannerId = 'standard' } = req.body;
      const userId = discordId || playerId;
      
      console.log('[GACHA PULL] Request:', { userId, bannerId });
      
      if (!userId) {
        console.log('[GACHA PULL] Error: No discordId provided');
        return res.status(400).json({ success: false, error: 'discordId requerido' });
      }

      const user = await usersCollection.findOne({ discordId: userId });
      if (!user) {
        console.log('[GACHA PULL] Error: User not found:', userId);
        return res.status(400).json({ success: false, error: 'Usuario no encontrado. Debes iniciar sesión primero.' });
      }
      
      const playerUuid = user?.minecraftUuid;
      console.log('[GACHA PULL] User found:', user.discordUsername, 'Balance:', user.cobbleDollars || user.cobbleDollarsBalance || 0);

      const result = await gachaService.pull(userId, playerUuid, bannerId, usersCollection);
      console.log('[GACHA PULL] Success:', result.reward?.rarity);
      res.json(result);
    } catch (error) {
      console.log('[GACHA PULL] Error:', error.message);
      res.status(400).json({ success: false, error: error.message });
    }
  });

  // POST /api/pokemon-gacha/multi-pull - 10 tiradas
  router.post('/multi-pull', async (req, res) => {
    try {
      const { playerId, discordId, bannerId = 'standard' } = req.body;
      const userId = discordId || playerId;
      
      console.log('[GACHA MULTI-PULL] Request:', { userId, bannerId });
      
      if (!userId) {
        console.log('[GACHA MULTI-PULL] Error: No discordId provided');
        return res.status(400).json({ success: false, error: 'discordId requerido' });
      }

      const user = await usersCollection.findOne({ discordId: userId });
      if (!user) {
        console.log('[GACHA MULTI-PULL] Error: User not found:', userId);
        return res.status(400).json({ success: false, error: 'Usuario no encontrado. Debes iniciar sesión primero.' });
      }
      
      const playerUuid = user?.minecraftUuid;
      console.log('[GACHA MULTI-PULL] User found:', user.discordUsername, 'Balance:', user.cobbleDollars || user.cobbleDollarsBalance || 0);

      const result = await gachaService.multiPull(userId, playerUuid, bannerId, usersCollection);
      console.log('[GACHA MULTI-PULL] Success:', result.highlights);
      res.json(result);
    } catch (error) {
      console.log('[GACHA MULTI-PULL] Error:', error.message);
      res.status(400).json({ success: false, error: error.message });
    }
  });

  // GET /api/pokemon-gacha/pity/:bannerId
  router.get('/pity/:bannerId', async (req, res) => {
    try {
      const playerId = req.query.playerId || req.query.discordId;
      if (!playerId) return res.status(400).json({ success: false, error: 'discordId requerido' });

      const currentPity = await gachaService.getPityCount(playerId, req.params.bannerId);
      res.json({ success: true, pityStatus: { currentPity, softPityStart: SOFT_PITY_START, hardPity: HARD_PITY } });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // GET /api/pokemon-gacha/history
  router.get('/history', async (req, res) => {
    try {
      const playerId = req.query.playerId || req.query.discordId;
      if (!playerId) return res.status(400).json({ success: false, error: 'discordId requerido' });

      const history = await gachaService.getHistory(playerId);
      res.json({ success: true, history });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // GET /api/pokemon-gacha/stats
  router.get('/stats', async (req, res) => {
    try {
      const playerId = req.query.playerId || req.query.discordId;
      if (!playerId) return res.status(400).json({ success: false, error: 'discordId requerido' });

      const stats = await gachaService.getStats(playerId);
      res.json({ success: true, stats });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ============================================
  // RUTAS PARA EL PLUGIN DE MINECRAFT
  // ============================================

  // GET /api/pokemon-gacha/pending/:uuid
  router.get('/pending/:uuid', async (req, res) => {
    try {
      const rewards = await gachaService.getPendingRewards(req.params.uuid);
      res.json({ success: true, rewards });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // POST /api/pokemon-gacha/claim/:rewardId
  router.post('/claim/:rewardId', async (req, res) => {
    try {
      const success = await gachaService.claimReward(req.params.rewardId);
      res.json({ success });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // POST /api/pokemon-gacha/delivery/failed
  router.post('/delivery/failed', async (req, res) => {
    try {
      const { rewardId, reason } = req.body;
      await gachaService.markDeliveryFailed(rewardId, reason);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ============================================
  // RUTAS DE ADMIN
  // ============================================

  // POST /api/pokemon-gacha/banners - Crear nuevo banner
  router.post('/banners', async (req, res) => {
    try {
      const { bannerId, name, nameEs, description, descriptionEs, type, artwork, singlePullCost, multiPullCost, endDate, featuredPokemon, featuredItems, isActive } = req.body;
      
      if (!bannerId || !nameEs) {
        return res.status(400).json({ success: false, error: 'bannerId y nameEs son requeridos' });
      }

      // Check if banner already exists
      const existing = await gachaService.bannersCollection.findOne({ bannerId });
      if (existing) {
        return res.status(400).json({ success: false, error: 'Ya existe un banner con ese ID' });
      }

      const newBanner = {
        bannerId,
        name: name || nameEs,
        nameEs,
        description: description || descriptionEs,
        descriptionEs: descriptionEs || description,
        type: type || 'limited',
        artwork: artwork || '',
        singlePullCost: singlePullCost || PULL_COSTS.single,
        multiPullCost: multiPullCost || PULL_COSTS.multi,
        endDate: endDate ? new Date(endDate) : null,
        featuredPokemon: featuredPokemon || [],
        featuredItems: featuredItems || [],
        isActive: isActive !== false,
        createdAt: new Date(),
      };

      await gachaService.bannersCollection.insertOne(newBanner);
      res.json({ success: true, banner: newBanner });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // PATCH /api/pokemon-gacha/banners/:id - Actualizar banner
  router.patch('/banners/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      // Remove fields that shouldn't be updated
      delete updates.bannerId;
      delete updates.createdAt;
      
      if (updates.endDate) {
        updates.endDate = new Date(updates.endDate);
      }
      
      updates.updatedAt = new Date();

      const result = await gachaService.bannersCollection.updateOne(
        { bannerId: id },
        { $set: updates }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ success: false, error: 'Banner no encontrado' });
      }

      const updated = await gachaService.bannersCollection.findOne({ bannerId: id });
      res.json({ success: true, banner: updated });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // DELETE /api/pokemon-gacha/banners/:id - Eliminar banner
  router.delete('/banners/:id', async (req, res) => {
    try {
      const { id } = req.params;
      
      // Don't allow deleting the standard banner
      if (id === 'standard') {
        return res.status(400).json({ success: false, error: 'No se puede eliminar el banner estándar' });
      }

      const result = await gachaService.bannersCollection.deleteOne({ bannerId: id });
      
      if (result.deletedCount === 0) {
        return res.status(404).json({ success: false, error: 'Banner no encontrado' });
      }

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.use('/api/pokemon-gacha', router);
  console.log('✓ Pokemon Gacha routes registered');
}

module.exports = { initPokemonGachaRoutes };
