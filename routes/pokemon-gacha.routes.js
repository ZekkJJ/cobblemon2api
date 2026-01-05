/**
 * Pokemon Gacha Routes (JavaScript)
 * Cobblemon Los Pitufos - Backend API
 * 
 * Sistema de gacha estilo Genshin Impact
 * Usando precisión decimal alta (10^8) para cálculos de probabilidad
 * 
 * FEATURES:
 * - Sistema de créditos (deposit in-game → créditos web)
 * - Auto-fusión de Pokémon repetidos (3 comunes = 1 uncommon, etc.)
 */

const express = require('express');
const crypto = require('crypto');

// ============================================
// CONFIGURACIÓN DEL GACHA
// ============================================

const PULL_COSTS = { single: 500, multi: 4500 };
const SHINY_RATE = 1 / 4096;

// PITY SYSTEM - Extended for Los Pitufos
// Hard pity at 400 pulls (guaranteed epic+)
// Soft pity starts at 350 and increases gradually
const SOFT_PITY_START = 350;
const HARD_PITY = 400;
// Each pull after soft pity adds 2% to epic chance
// At pull 350: +0%, at pull 375: +50%, at pull 400: 100%
const SOFT_PITY_INCREASE = 0.02; // 2% per pull after soft pity start

// ============================================
// SISTEMA DE STARDUST POR DUPLICADOS
// ============================================
// Los Pokémon repetidos otorgan Stardust automáticamente
// El Stardust se puede usar para:
// - Comprar items en la tienda de Stardust
// - Intercambiar por CobbleDollars

// Stardust por duplicado según rareza (NO fusión, cada duplicado da stardust)
const STARDUST_BY_RARITY = {
  common: 10,
  uncommon: 25,
  rare: 50,
  epic: 100,
  legendary: 250,
  mythic: 500,
};

// Multiplicador para shiny duplicados
const SHINY_STARDUST_MULTIPLIER = 5;

const FUSION_CONFIG = {
  // Cuántos repetidos necesitas para fusionar (legacy, no usado)
  DUPLICATES_TO_FUSE: 3,
  
  // Stardust por rareza cuando se fusiona (legacy)
  STARDUST_PER_RARITY: STARDUST_BY_RARITY,
  
  // Costo de tirada en stardust (alternativa a CD)
  PULL_COST_STARDUST: 100,
  MULTI_PULL_COST_STARDUST: 900,
  
  // Bonus temporal de probabilidad (comprable con stardust)
  LUCK_BOOST_COST: 500,      // 500 stardust
  LUCK_BOOST_DURATION_MS: 30 * 60 * 1000, // 30 minutos
  LUCK_BOOST_MULTIPLIER: 2.0, // +100% probabilidad de raros+ (EVENTO ESPECIAL)
};

// Precisión decimal: usamos enteros multiplicados por 10^8 para evitar errores de punto flotante
const PRECISION = 100000000; // 10^8

// Probabilidades base por rareza (en formato de alta precisión)
// SUPER NERFED - Epic (pseudos) al 1% máximo
// common=63%, uncommon=25%, rare=10.5%, epic=1%, legendary=0.4%, mythic=0.1%
const BASE_RATES_PRECISE = {
  common:    63000000,  // 63.000000%
  uncommon:  25000000,  // 25.000000%
  rare:      10500000,  // 10.500000%
  epic:       1000000,  //  1.000000% (pseudos - MÁXIMO 1%)
  legendary:   400000,  //  0.400000% (legendarios)
  mythic:      100000,  //  0.100000% (míticos)
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

// Bonus de probabilidad para featured pokemon (+0.5% sobre su rareza base - NERFED from 3%)
const FEATURED_BONUS = 0.005;

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
    this.pendingSyncCollection = db.collection('economy_pending_sync');
    this.creditsCollection = db.collection('gacha_credits');
    this.inventoryCollection = db.collection('gacha_inventory'); // Para tracking de repetidos
  }

  async ensureIndexes() {
    try {
      await this.bannersCollection.createIndex({ bannerId: 1 }, { unique: true });
      await this.historyCollection.createIndex({ playerId: 1, pulledAt: -1 });
      await this.pityCollection.createIndex({ playerId: 1, bannerId: 1 }, { unique: true });
      await this.pendingCollection.createIndex({ playerUuid: 1, status: 1 });
      await this.pendingCollection.createIndex({ rewardId: 1 }, { unique: true });
      await this.creditsCollection.createIndex({ discordId: 1 }, { unique: true });
      await this.inventoryCollection.createIndex({ discordId: 1, pokemonId: 1 });
      console.log('[POKEMON GACHA] Índices creados');
    } catch (e) {
      console.error('[POKEMON GACHA] Error creando índices:', e.message);
    }
  }

  // ============================================
  // SISTEMA DE CRÉDITOS (CASINO)
  // ============================================

  async getCredits(discordId) {
    const record = await this.creditsCollection.findOne({ discordId });
    return {
      credits: record?.credits || 0,
      stardust: record?.stardust || 0,
      luckBoostUntil: record?.luckBoostUntil || null,
    };
  }

  async addCredits(discordId, amount, reason = 'deposit') {
    const result = await this.creditsCollection.updateOne(
      { discordId },
      { 
        $inc: { credits: amount },
        $push: { 
          transactions: {
            type: 'credit',
            amount,
            reason,
            timestamp: new Date()
          }
        },
        $setOnInsert: { stardust: 0, createdAt: new Date() }
      },
      { upsert: true }
    );
    console.log(`[GACHA CREDITS] Added ${amount} credits to ${discordId} (${reason})`);
    return this.getCredits(discordId);
  }

  async removeCredits(discordId, amount, reason = 'pull') {
    const current = await this.getCredits(discordId);
    if (current.credits < amount) {
      throw new Error(`Créditos insuficientes. Tienes ${current.credits}, necesitas ${amount}`);
    }
    
    await this.creditsCollection.updateOne(
      { discordId },
      { 
        $inc: { credits: -amount },
        $push: { 
          transactions: {
            type: 'debit',
            amount: -amount,
            reason,
            timestamp: new Date()
          }
        }
      }
    );
    console.log(`[GACHA CREDITS] Removed ${amount} credits from ${discordId} (${reason})`);
    return this.getCredits(discordId);
  }

  async addStardust(discordId, amount, reason = 'fusion') {
    await this.creditsCollection.updateOne(
      { discordId },
      { 
        $inc: { stardust: amount },
        $setOnInsert: { credits: 0, createdAt: new Date() }
      },
      { upsert: true }
    );
    console.log(`[GACHA STARDUST] Added ${amount} stardust to ${discordId} (${reason})`);
    return this.getCredits(discordId);
  }

  async removeStardust(discordId, amount, reason = 'purchase') {
    const current = await this.getCredits(discordId);
    if (current.stardust < amount) {
      throw new Error(`Stardust insuficiente. Tienes ${current.stardust}, necesitas ${amount}`);
    }
    
    await this.creditsCollection.updateOne(
      { discordId },
      { $inc: { stardust: -amount } }
    );
    return this.getCredits(discordId);
  }

  async activateLuckBoost(discordId) {
    const current = await this.getCredits(discordId);
    if (current.stardust < FUSION_CONFIG.LUCK_BOOST_COST) {
      throw new Error(`Necesitas ${FUSION_CONFIG.LUCK_BOOST_COST} stardust para activar el boost`);
    }
    
    const boostUntil = new Date(Date.now() + FUSION_CONFIG.LUCK_BOOST_DURATION_MS);
    
    await this.creditsCollection.updateOne(
      { discordId },
      { 
        $inc: { stardust: -FUSION_CONFIG.LUCK_BOOST_COST },
        $set: { luckBoostUntil: boostUntil }
      }
    );
    
    console.log(`[GACHA] Luck boost activated for ${discordId} until ${boostUntil}`);
    return { boostUntil, cost: FUSION_CONFIG.LUCK_BOOST_COST };
  }

  hasActiveLuckBoost(creditData) {
    if (!creditData?.luckBoostUntil) return false;
    return new Date(creditData.luckBoostUntil) > new Date();
  }

  // ============================================
  // SISTEMA DE STARDUST POR DUPLICADOS
  // ============================================

  async trackPokemonPull(discordId, pokemonId, rarity, isShiny = false) {
    // Incrementar contador de este Pokémon
    const result = await this.inventoryCollection.findOneAndUpdate(
      { discordId, pokemonId },
      { 
        $inc: { count: 1 },
        $set: { rarity, lastPulled: new Date() },
        $setOnInsert: { firstPulled: new Date() }
      },
      { upsert: true, returnDocument: 'after' }
    );
    
    const count = result?.count || 1;
    const isNew = count === 1;
    
    // Si es duplicado (count > 1), dar Stardust
    if (!isNew) {
      let stardustAmount = STARDUST_BY_RARITY[rarity] || 10;
      if (isShiny) {
        stardustAmount *= SHINY_STARDUST_MULTIPLIER;
      }
      
      await this.addStardust(discordId, stardustAmount, `duplicate_${pokemonId}${isShiny ? '_shiny' : ''}`);
      
      console.log(`[GACHA STARDUST] ${discordId} got duplicate #${pokemonId}${isShiny ? ' (SHINY)' : ''} → ${stardustAmount} stardust`);
      
      return { 
        isDuplicate: true, 
        isNew: false,
        count, 
        stardustGained: stardustAmount,
        fused: false 
      };
    }
    
    return { isDuplicate: false, isNew: true, count, stardustGained: 0, fused: false };
  }

  async autoFuse(discordId, pokemonId, rarity, currentCount) {
    // Legacy function - kept for compatibility but not used
    // Stardust is now given per duplicate, not per fusion
    return { fused: false, count: currentCount };
  }

  async getInventory(discordId) {
    const inventory = await this.inventoryCollection.find({ discordId }).toArray();
    return inventory;
  }

  async getInventoryStats(discordId) {
    const inventory = await this.getInventory(discordId);
    const stats = {
      totalUnique: inventory.length,
      totalPokemon: inventory.reduce((sum, p) => sum + p.count, 0),
      byRarity: {},
      duplicates: inventory.filter(p => p.count >= 2).length,
      readyToFuse: inventory.filter(p => p.count >= FUSION_CONFIG.DUPLICATES_TO_FUSE).length,
    };
    
    for (const pokemon of inventory) {
      stats.byRarity[pokemon.rarity] = (stats.byRarity[pokemon.rarity] || 0) + pokemon.count;
    }
    
    return stats;
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

  async getTotalPulls(playerId, bannerId) {
    // Count total pulls from history
    const count = await this.historyCollection.countDocuments({ playerId, bannerId });
    return count;
  }

  // Selección de rareza con precisión decimal alta (10^8)
  // allowedRarities: objeto con { epic: true/false, legendary: true/false, mythic: true/false }
  // hasLuckBoost: si tiene el boost de suerte activo (+50% a raros+)
  selectRarityPrecise(pityCount, featuredPokemon = [], allowedRarities = {}, hasLuckBoost = false) {
    // Usar enteros para evitar errores de punto flotante
    const rates = { ...BASE_RATES_PRECISE };
    
    // Si ciertas rarezas están deshabilitadas, redistribuir su probabilidad a common
    const disabledRarities = [];
    if (allowedRarities.allowEpic === false) {
      disabledRarities.push('epic');
      rates.common += rates.epic;
      rates.epic = 0;
    }
    if (allowedRarities.allowLegendary === false) {
      disabledRarities.push('legendary');
      rates.common += rates.legendary;
      rates.legendary = 0;
    }
    if (allowedRarities.allowMythic === false) {
      disabledRarities.push('mythic');
      rates.common += rates.mythic;
      rates.mythic = 0;
    }
    
    // LUCK BOOST: +50% a probabilidades de rare, epic, legendary, mythic
    if (hasLuckBoost) {
      const boostMultiplier = FUSION_CONFIG.LUCK_BOOST_MULTIPLIER;
      rates.rare = Math.floor(rates.rare * boostMultiplier);
      rates.epic = Math.floor(rates.epic * boostMultiplier);
      rates.legendary = Math.floor(rates.legendary * boostMultiplier);
      rates.mythic = Math.floor(rates.mythic * boostMultiplier);
      // Reducir common para compensar
      const totalBoost = (rates.rare - BASE_RATES_PRECISE.rare) + 
                         (rates.epic - BASE_RATES_PRECISE.epic) +
                         (rates.legendary - BASE_RATES_PRECISE.legendary) +
                         (rates.mythic - BASE_RATES_PRECISE.mythic);
      rates.common = Math.max(0, rates.common - totalBoost);
    }
    
    // HARD PITY: Garantiza epic SIEMPRE en tirada 90+
    // El hard pity ignora las restricciones de allowedRarities porque es un contador global
    // Si ya salió un epic en este x10, el pity se resetea de todas formas
    if (pityCount >= HARD_PITY) {
      return 'epic';
    }
    
    // SOFT PITY: Aumenta dramáticamente la probabilidad de epic desde tirada 75
    // Cada tirada después de 75 añade +5% a la probabilidad de epic (Genshin-style)
    // Tirada 75: +0%, Tirada 76: +5%, Tirada 80: +25%, Tirada 85: +50%, Tirada 89: +70%
    // Esto hace que sea MUY probable conseguir epic antes del hard pity
    if (pityCount >= SOFT_PITY_START) {
      const pullsIntoPity = pityCount - SOFT_PITY_START;
      // Bonus dramático: cada pull añade 5% (5000000 en precisión 10^8)
      const bonusPrecise = Math.floor(pullsIntoPity * SOFT_PITY_INCREASE * PRECISION);
      
      // Restaurar rates.epic si fue deshabilitado, para que el soft pity funcione
      if (rates.epic === 0 && allowedRarities.allowEpic === false) {
        rates.epic = BASE_RATES_PRECISE.epic;
        rates.common -= BASE_RATES_PRECISE.epic; // Revertir la redistribución
      }
      
      // Aplicar bonus (máximo 50% de probabilidad)
      rates.epic = Math.min(rates.epic + bonusPrecise, Math.floor(0.5 * PRECISION));
      
      // Reducir common para compensar el aumento de epic
      rates.common = Math.max(0, rates.common - bonusPrecise);
    }

    // Agregar bonus de featured (+3% a la rareza de cada featured)
    for (const featured of featuredPokemon) {
      if (rates[featured.rarity] !== undefined && rates[featured.rarity] > 0) {
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
    // Obtener banner para featured pokemon y restricciones de rareza
    const banner = await this.getBanner(bannerId);
    const featuredPokemon = banner?.featuredPokemon || [];
    
    // Obtener restricciones de rareza del banner (por defecto todo deshabilitado para seguridad)
    const allowedRarities = {
      allowEpic: banner?.allowEpic ?? false,
      allowLegendary: banner?.allowLegendary ?? false,
      allowMythic: banner?.allowMythic ?? false,
    };
    
    // Verificar si tiene luck boost activo
    const creditData = await this.getCredits(playerId);
    const hasLuckBoost = this.hasActiveLuckBoost(creditData);
    
    const pityCount = await this.getPityCount(playerId, bannerId);
    // Usar la función de precisión alta con restricciones
    const rarity = this.selectRarityPrecise(pityCount, featuredPokemon, allowedRarities, hasLuckBoost);
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
      fusionResult: null, // Se llena si hay auto-fusión
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
      
      // STARDUST: Trackear el Pokémon y dar Stardust si es duplicado
      // Todos los Pokémon se trackean, duplicados dan Stardust
      const trackResult = await this.trackPokemonPull(playerId, selected.data.pokemonId, rarity, isShiny);
      reward.stardustResult = trackResult;
      
      if (trackResult.isDuplicate) {
        console.log(`[GACHA STARDUST] Duplicate for ${playerId}: +${trackResult.stardustGained} stardust`);
      }
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

    // Crear entrega pendiente - SIEMPRE entregar el Pokémon
    // (Stardust se da automáticamente por duplicados, pero el Pokémon siempre se entrega)
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
    
    // Obtener el banner para usar sus precios personalizados
    const banner = await this.getBanner(bannerId);
    const cost = Number(banner?.singlePullCost || PULL_COSTS.single);
    
    // IMPORTANTE: Usar el balance correcto - cobbleDollars es el campo principal
    // cobbleDollarsBalance puede estar desincronizado, usar el mayor de los dos
    const balanceA = Number(user.cobbleDollars) || 0;
    const balanceB = Number(user.cobbleDollarsBalance) || 0;
    const balance = Math.max(balanceA, balanceB);
    
    console.log('[GACHA DEBUG] cobbleDollars:', balanceA, 'cobbleDollarsBalance:', balanceB, 'Using:', balance, 'Cost:', cost, 'Banner:', bannerId);
    
    if (balance < cost) {
      throw new Error(`Balance insuficiente. Necesitas ${cost} CD`);
    }

    // Deducir balance en MongoDB
    await usersCollection.updateOne(
      { discordId: playerId },
      { $inc: { cobbleDollarsBalance: -cost, cobbleDollars: -cost } }
    );

    // Crear pending sync para que el plugin quite el dinero in-game
    if (user.minecraftUuid) {
      await this.pendingSyncCollection.insertOne({
        uuid: user.minecraftUuid,
        username: user.minecraftUsername || 'Unknown',
        type: 'remove',
        amount: cost,
        reason: `Gacha pull x1 (${banner?.nameEs || bannerId})`,
        source: 'gacha',
        synced: false,
        createdAt: new Date()
      });
      console.log('[GACHA] Created pending sync for', user.minecraftUsername, '- remove', cost, 'CD');
    }

    const reward = await this.executePull(playerId, playerUuid, bannerId);
    const newBalance = balance - cost;
    
    // Get full pity status including totalPulls
    const currentPity = await this.getPityCount(playerId, bannerId);
    const totalPulls = await this.getTotalPulls(playerId, bannerId);
    const stardust = await this.getCredits(playerId);

    return {
      success: true,
      reward,
      newBalance,
      pityStatus: { 
        currentPity, 
        pullsSinceEpic: currentPity,
        softPityStart: SOFT_PITY_START, 
        hardPity: HARD_PITY,
        totalPulls,
        softPityActive: currentPity >= SOFT_PITY_START,
        pullsUntilHardPity: Math.max(0, HARD_PITY - currentPity),
      },
      stardust: {
        balance: stardust.stardust || 0,
        gained: reward.stardustResult?.stardustGained || 0,
      },
    };
  }

  async multiPull(playerId, playerUuid, bannerId, usersCollection) {
    const user = await usersCollection.findOne({ discordId: playerId });
    if (!user) throw new Error('Jugador no encontrado');
    
    // Obtener el banner para usar sus precios personalizados
    const banner = await this.getBanner(bannerId);
    const cost = Number(banner?.multiPullCost || PULL_COSTS.multi);
    
    // IMPORTANTE: Usar el balance correcto - cobbleDollars es el campo principal
    // cobbleDollarsBalance puede estar desincronizado, usar el mayor de los dos
    const balanceA = Number(user.cobbleDollars) || 0;
    const balanceB = Number(user.cobbleDollarsBalance) || 0;
    const balance = Math.max(balanceA, balanceB);
    
    console.log('[GACHA DEBUG] Multi-pull cobbleDollars:', balanceA, 'cobbleDollarsBalance:', balanceB, 'Using:', balance, 'Cost:', cost, 'Banner:', bannerId);
    
    if (balance < cost) {
      throw new Error(`Balance insuficiente. Necesitas ${cost} CD`);
    }

    await usersCollection.updateOne(
      { discordId: playerId },
      { $inc: { cobbleDollarsBalance: -cost, cobbleDollars: -cost } }
    );

    // Crear pending sync para que el plugin quite el dinero in-game
    if (user.minecraftUuid) {
      await this.pendingSyncCollection.insertOne({
        uuid: user.minecraftUuid,
        username: user.minecraftUsername || 'Unknown',
        type: 'remove',
        amount: cost,
        reason: `Gacha pull x10 (${banner?.nameEs || bannerId})`,
        source: 'gacha',
        synced: false,
        createdAt: new Date()
      });
      console.log('[GACHA] Created pending sync for', user.minecraftUsername, '- remove', cost, 'CD');
    }

    // NERF: Máximo 1 epic/legendary/mythic por multi-pull
    // Si ya salió uno, los demás pulls fuerzan common/uncommon/rare
    const rewards = [];
    let gotEpicOrBetter = false;
    
    for (let i = 0; i < 10; i++) {
      // Si ya sacó un epic+, forzar que los siguientes NO puedan sacar epic+
      const forceNoEpic = gotEpicOrBetter;
      const reward = await this.executePullWithRestriction(playerId, playerUuid, bannerId, forceNoEpic);
      rewards.push(reward);
      
      // Marcar si sacó epic o mejor
      if (['epic', 'legendary', 'mythic'].includes(reward.rarity)) {
        gotEpicOrBetter = true;
        console.log(`[GACHA MULTI] Got ${reward.rarity} on pull ${i + 1}/10 - blocking further epic+ pulls`);
      }
    }

    const newBalance = balance - cost;
    const highlights = {
      epicOrBetter: rewards.filter(r => ['epic', 'legendary', 'mythic'].includes(r.rarity)).length,
      shinies: rewards.filter(r => r.isShiny).length,
    };
    
    // Get full pity status including totalPulls
    const currentPity = await this.getPityCount(playerId, bannerId);
    const totalPulls = await this.getTotalPulls(playerId, bannerId);
    const stardust = await this.getCredits(playerId);
    const totalStardustGained = rewards.reduce((sum, r) => sum + (r.stardustResult?.stardustGained || 0), 0);

    return {
      success: true,
      rewards,
      newBalance,
      pityStatus: { 
        currentPity, 
        pullsSinceEpic: currentPity,
        softPityStart: SOFT_PITY_START, 
        hardPity: HARD_PITY,
        totalPulls,
        softPityActive: currentPity >= SOFT_PITY_START,
        pullsUntilHardPity: Math.max(0, HARD_PITY - currentPity),
      },
      stardust: {
        balance: stardust.stardust || 0,
        gained: totalStardustGained,
      },
      highlights,
    };
  }

  // Versión de executePull que puede forzar NO epic/legendary/mythic
  async executePullWithRestriction(playerId, playerUuid, bannerId, forceNoEpic = false) {
    // Obtener banner para featured pokemon y restricciones de rareza
    const banner = await this.getBanner(bannerId);
    const featuredPokemon = banner?.featuredPokemon || [];
    
    // Obtener restricciones de rareza del banner
    let allowedRarities = {
      allowEpic: banner?.allowEpic ?? false,
      allowLegendary: banner?.allowLegendary ?? false,
      allowMythic: banner?.allowMythic ?? false,
    };
    
    // Si forceNoEpic, deshabilitar todas las rarezas altas
    if (forceNoEpic) {
      allowedRarities = {
        allowEpic: false,
        allowLegendary: false,
        allowMythic: false,
      };
    }
    
    // Verificar si tiene luck boost activo
    const creditData = await this.getCredits(playerId);
    const hasLuckBoost = this.hasActiveLuckBoost(creditData);
    
    const pityCount = await this.getPityCount(playerId, bannerId);
    // Usar la función de precisión alta con restricciones
    const rarity = this.selectRarityPrecise(pityCount, featuredPokemon, allowedRarities, hasLuckBoost);
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
      fusionResult: null,
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
      
      // AUTO-FUSIÓN: Trackear el Pokémon y fusionar si hay repetidos
      if (['common', 'uncommon'].includes(rarity) && !isShiny) {
        const fusionResult = await this.trackPokemonPull(playerId, selected.data.pokemonId, rarity);
        reward.fusionResult = fusionResult;
      }
    } else {
      reward.item = {
        itemId: selected.data.itemId,
        name: selected.data.name,
        quantity: selected.data.quantity,
      };
    }

    // PITY RESET: Si sale epic/legendary/mythic, resetear pity INMEDIATAMENTE
    if (['epic', 'legendary', 'mythic'].includes(rarity)) {
      await this.resetPity(playerId, bannerId);
      console.log(`[GACHA PITY] Reset pity for ${playerId} after getting ${rarity}`);
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
    const shouldDeliver = !reward.fusionResult?.fused || isShiny || !['common', 'uncommon'].includes(rarity);
    
    if (shouldDeliver) {
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
    } else {
      reward.status = 'auto_fused';
    }

    return reward;
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
      const totalPulls = await gachaService.getTotalPulls(playerId, req.params.bannerId);
      const stardust = await gachaService.getCredits(playerId);
      
      res.json({ 
        success: true, 
        pityStatus: { 
          currentPity, 
          pullsSinceEpic: currentPity,
          softPityStart: SOFT_PITY_START, 
          hardPity: HARD_PITY,
          totalPulls,
          softPityActive: currentPity >= SOFT_PITY_START,
          pullsUntilHardPity: Math.max(0, HARD_PITY - currentPity),
        },
        stardust: {
          balance: stardust.stardust || 0,
        },
      });
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

  // GET /api/pokemon-gacha/stardust - Obtener balance de Stardust
  router.get('/stardust', async (req, res) => {
    try {
      const playerId = req.query.playerId || req.query.discordId;
      if (!playerId) return res.status(400).json({ success: false, error: 'discordId requerido' });

      const credits = await gachaService.getCredits(playerId);
      const inventory = await gachaService.getInventoryStats(playerId);
      
      res.json({ 
        success: true, 
        stardust: {
          balance: credits.stardust || 0,
          totalEarned: credits.totalStardustEarned || credits.stardust || 0,
        },
        inventory: {
          totalUnique: inventory.totalUnique,
          totalPokemon: inventory.totalPokemon,
          duplicates: inventory.duplicates,
        },
      });
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
  // RUTAS DE CRÉDITOS (CASINO)
  // ============================================

  // GET /api/pokemon-gacha/credits/:discordId - Obtener créditos y stardust
  router.get('/credits/:discordId', async (req, res) => {
    try {
      const credits = await gachaService.getCredits(req.params.discordId);
      res.json({ success: true, ...credits });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // POST /api/pokemon-gacha/credits/deposit - Depositar CD → Créditos (llamado por plugin)
  router.post('/credits/deposit', async (req, res) => {
    try {
      const { uuid, discordId, amount } = req.body;
      
      if (!discordId && !uuid) {
        return res.status(400).json({ success: false, error: 'discordId o uuid requerido' });
      }
      if (!amount || amount <= 0) {
        return res.status(400).json({ success: false, error: 'amount debe ser positivo' });
      }

      // Si viene uuid, buscar el discordId
      let finalDiscordId = discordId;
      if (!finalDiscordId && uuid) {
        const user = await usersCollection.findOne({ minecraftUuid: uuid });
        if (!user) {
          return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
        }
        finalDiscordId = user.discordId;
      }

      const result = await gachaService.addCredits(finalDiscordId, amount, 'deposit_ingame');
      
      console.log(`[GACHA CASINO] Deposit: ${amount} CD → credits for ${finalDiscordId}`);
      
      res.json({ 
        success: true, 
        credits: result.credits,
        stardust: result.stardust,
        deposited: amount
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // POST /api/pokemon-gacha/credits/withdraw - Retirar Créditos → CD (llamado por plugin)
  router.post('/credits/withdraw', async (req, res) => {
    try {
      const { uuid, discordId, amount } = req.body;
      
      if (!discordId && !uuid) {
        return res.status(400).json({ success: false, error: 'discordId o uuid requerido' });
      }
      if (!amount || amount <= 0) {
        return res.status(400).json({ success: false, error: 'amount debe ser positivo' });
      }

      let finalDiscordId = discordId;
      let userUuid = uuid;
      
      if (!finalDiscordId && uuid) {
        const user = await usersCollection.findOne({ minecraftUuid: uuid });
        if (!user) {
          return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
        }
        finalDiscordId = user.discordId;
        userUuid = user.minecraftUuid;
      }

      // Verificar que tiene suficientes créditos
      const result = await gachaService.removeCredits(finalDiscordId, amount, 'withdraw_ingame');
      
      // Crear pending sync para dar el dinero in-game
      await gachaService.pendingSyncCollection.insertOne({
        uuid: userUuid,
        username: 'Unknown',
        type: 'add',
        amount: amount,
        reason: 'Casino withdrawal',
        source: 'gacha_casino',
        synced: false,
        createdAt: new Date()
      });
      
      console.log(`[GACHA CASINO] Withdraw: ${amount} credits → CD for ${finalDiscordId}`);
      
      res.json({ 
        success: true, 
        credits: result.credits,
        stardust: result.stardust,
        withdrawn: amount
      });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  // POST /api/pokemon-gacha/credits/luck-boost - Activar luck boost con stardust
  router.post('/credits/luck-boost', async (req, res) => {
    try {
      const { discordId } = req.body;
      if (!discordId) {
        return res.status(400).json({ success: false, error: 'discordId requerido' });
      }

      const result = await gachaService.activateLuckBoost(discordId);
      res.json({ success: true, ...result });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  // POST /api/pokemon-gacha/credits/add-stardust - Agregar stardust (llamado por plugin fusion)
  router.post('/credits/add-stardust', async (req, res) => {
    try {
      const { uuid, stardust, source } = req.body;
      
      if (!uuid || typeof stardust !== 'number' || stardust <= 0) {
        return res.status(400).json({ success: false, error: 'uuid y stardust (>0) requeridos' });
      }

      // Find user by minecraft UUID
      const user = await usersCollection.findOne({ minecraftUuid: uuid });
      if (!user || !user.discordId) {
        return res.status(400).json({ success: false, error: 'Usuario no encontrado o no vinculado' });
      }

      // Add stardust to credits collection
      const result = await gachaService.creditsCollection.findOneAndUpdate(
        { discordId: user.discordId },
        { 
          $inc: { stardust: stardust },
          $set: { updatedAt: new Date() },
          $setOnInsert: { discordId: user.discordId, credits: 0, createdAt: new Date() }
        },
        { upsert: true, returnDocument: 'after' }
      );

      console.log(`[GACHA] Added ${stardust} stardust to ${user.minecraftUsername || uuid} (source: ${source || 'unknown'})`);

      res.json({ 
        success: true, 
        stardust: result.stardust || stardust,
        source: source || 'unknown'
      });
    } catch (error) {
      console.error('[GACHA] Error adding stardust:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // GET /api/pokemon-gacha/inventory/:discordId - Ver inventario de Pokémon
  router.get('/inventory/:discordId', async (req, res) => {
    try {
      const inventory = await gachaService.getInventory(req.params.discordId);
      const stats = await gachaService.getInventoryStats(req.params.discordId);
      res.json({ success: true, inventory, stats });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // POST /api/pokemon-gacha/pull-with-credits - Tirar usando créditos en vez de CD
  router.post('/pull-with-credits', async (req, res) => {
    try {
      const { discordId, bannerId = 'standard' } = req.body;
      
      if (!discordId) {
        return res.status(400).json({ success: false, error: 'discordId requerido' });
      }

      const user = await usersCollection.findOne({ discordId });
      if (!user) {
        return res.status(400).json({ success: false, error: 'Usuario no encontrado' });
      }

      // Verificar créditos
      const credits = await gachaService.getCredits(discordId);
      if (credits.credits < PULL_COSTS.single) {
        return res.status(400).json({ 
          success: false, 
          error: `Créditos insuficientes. Tienes ${credits.credits}, necesitas ${PULL_COSTS.single}` 
        });
      }

      // Deducir créditos
      await gachaService.removeCredits(discordId, PULL_COSTS.single, 'gacha_pull');

      // Ejecutar pull
      const playerUuid = user.minecraftUuid;
      const reward = await gachaService.executePull(discordId, playerUuid, bannerId);
      const newCredits = await gachaService.getCredits(discordId);

      console.log('[GACHA PULL WITH CREDITS] Success:', reward.rarity);
      
      res.json({
        success: true,
        reward,
        newCredits: newCredits.credits,
        stardust: newCredits.stardust,
        pityStatus: { 
          currentPity: await gachaService.getPityCount(discordId, bannerId), 
          softPityStart: SOFT_PITY_START, 
          hardPity: HARD_PITY 
        },
      });
    } catch (error) {
      console.log('[GACHA PULL WITH CREDITS] Error:', error.message);
      res.status(400).json({ success: false, error: error.message });
    }
  });

  // POST /api/pokemon-gacha/multi-pull-with-credits - 10 tiradas con créditos
  router.post('/multi-pull-with-credits', async (req, res) => {
    try {
      const { discordId, bannerId = 'standard' } = req.body;
      
      if (!discordId) {
        return res.status(400).json({ success: false, error: 'discordId requerido' });
      }

      const user = await usersCollection.findOne({ discordId });
      if (!user) {
        return res.status(400).json({ success: false, error: 'Usuario no encontrado' });
      }

      // Verificar créditos
      const credits = await gachaService.getCredits(discordId);
      if (credits.credits < PULL_COSTS.multi) {
        return res.status(400).json({ 
          success: false, 
          error: `Créditos insuficientes. Tienes ${credits.credits}, necesitas ${PULL_COSTS.multi}` 
        });
      }

      // Deducir créditos
      await gachaService.removeCredits(discordId, PULL_COSTS.multi, 'gacha_multi_pull');

      // Ejecutar 10 pulls
      const playerUuid = user.minecraftUuid;
      const rewards = [];
      for (let i = 0; i < 10; i++) {
        const reward = await gachaService.executePull(discordId, playerUuid, bannerId);
        rewards.push(reward);
      }

      const newCredits = await gachaService.getCredits(discordId);
      const highlights = {
        epicOrBetter: rewards.filter(r => ['epic', 'legendary', 'mythic'].includes(r.rarity)).length,
        shinies: rewards.filter(r => r.isShiny).length,
        fused: rewards.filter(r => r.fusionResult?.fused).length,
        stardustGained: rewards.reduce((sum, r) => sum + (r.fusionResult?.stardustGained || 0), 0),
      };

      console.log('[GACHA MULTI-PULL WITH CREDITS] Success:', highlights);
      
      res.json({
        success: true,
        rewards,
        newCredits: newCredits.credits,
        stardust: newCredits.stardust,
        pityStatus: { 
          currentPity: await gachaService.getPityCount(discordId, bannerId), 
          softPityStart: SOFT_PITY_START, 
          hardPity: HARD_PITY 
        },
        highlights,
      });
    } catch (error) {
      console.log('[GACHA MULTI-PULL WITH CREDITS] Error:', error.message);
      res.status(400).json({ success: false, error: error.message });
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

  // ============================================
  // ADMIN: CLEAR GACHA POKEMON
  // ============================================

  // POST /api/pokemon-gacha/admin/clear-player/:uuid - Limpiar todos los pokemon claimeados de un jugador
  router.post('/admin/clear-player/:uuid', async (req, res) => {
    try {
      const { uuid } = req.params;
      const { refund = false } = req.body;
      
      console.log('[GACHA ADMIN] Clear player request for UUID:', uuid, 'Refund:', refund);
      
      if (!uuid) {
        return res.status(400).json({ success: false, error: 'UUID requerido' });
      }

      // Buscar usuario por UUID
      const user = await usersCollection.findOne({ minecraftUuid: uuid });
      if (!user) {
        return res.status(404).json({ success: false, error: 'Usuario no encontrado con ese UUID' });
      }

      const playerId = user.discordId;
      
      // Contar rewards pendientes y claimeados
      const pendingCount = await gachaService.pendingCollection.countDocuments({ 
        playerUuid: uuid, 
        status: 'pending' 
      });
      const claimedCount = await gachaService.pendingCollection.countDocuments({ 
        playerUuid: uuid, 
        status: 'claimed' 
      });
      
      // Contar historial
      const historyCount = await gachaService.historyCollection.countDocuments({ playerId });
      
      // Calcular refund si se solicita
      let refundAmount = 0;
      if (refund) {
        const history = await gachaService.historyCollection.find({ playerId }).toArray();
        refundAmount = history.reduce((sum, h) => sum + (h.cost || 0), 0);
      }

      // Eliminar todos los pending rewards
      const deletedPending = await gachaService.pendingCollection.deleteMany({ playerUuid: uuid });
      
      // Eliminar historial
      const deletedHistory = await gachaService.historyCollection.deleteMany({ playerId });
      
      // Resetear pity
      const deletedPity = await gachaService.pityCollection.deleteMany({ playerId });
      
      // Aplicar refund si se solicita
      if (refund && refundAmount > 0) {
        await usersCollection.updateOne(
          { discordId: playerId },
          { $inc: { cobbleDollars: refundAmount, cobbleDollarsBalance: refundAmount } }
        );
        console.log('[GACHA ADMIN] Refunded', refundAmount, 'CD to', user.discordUsername);
      }

      const result = {
        success: true,
        cleared: {
          pendingRewards: deletedPending.deletedCount,
          claimedRewards: claimedCount,
          historyRecords: deletedHistory.deletedCount,
          pityRecords: deletedPity.deletedCount,
        },
        refund: refund ? refundAmount : 0,
        player: {
          uuid,
          discordId: playerId,
          username: user.discordUsername || user.minecraftUsername
        }
      };

      console.log('[GACHA ADMIN] Clear complete:', result);
      res.json(result);
    } catch (error) {
      console.error('[GACHA ADMIN] Error clearing player:', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // GET /api/pokemon-gacha/admin/player-info/:uuid - Obtener info de gacha de un jugador
  router.get('/admin/player-info/:uuid', async (req, res) => {
    try {
      const { uuid } = req.params;
      
      const user = await usersCollection.findOne({ minecraftUuid: uuid });
      if (!user) {
        return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
      }

      const playerId = user.discordId;
      
      const pendingRewards = await gachaService.pendingCollection.find({ playerUuid: uuid }).toArray();
      const history = await gachaService.historyCollection.find({ playerId }).sort({ pulledAt: -1 }).limit(50).toArray();
      const pity = await gachaService.pityCollection.find({ playerId }).toArray();
      
      const totalSpent = history.reduce((sum, h) => sum + (h.cost || 0), 0);
      
      res.json({
        success: true,
        player: {
          uuid,
          discordId: playerId,
          username: user.discordUsername || user.minecraftUsername
        },
        stats: {
          totalPulls: history.length,
          totalSpent,
          pendingRewards: pendingRewards.filter(r => r.status === 'pending').length,
          claimedRewards: pendingRewards.filter(r => r.status === 'claimed').length,
        },
        pity,
        recentHistory: history.slice(0, 10)
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.use('/api/pokemon-gacha', router);
  console.log('✓ Pokemon Gacha routes registered');
}

module.exports = { initPokemonGachaRoutes };
