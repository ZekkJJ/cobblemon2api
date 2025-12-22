/**
 * Punto de Entrada del Servidor
 * Cobblemon Los Pitufos - Backend API
 * 
 * VERSIÓN COMPLETA con todos los endpoints para el plugin
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const { MongoClient } = require('mongodb');
const crypto = require('crypto');

// Environment variables
const PORT = process.env.PORT || 25617;
const MONGODB_URI = process.env.MONGODB_URI || '';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const NODE_ENV = process.env.NODE_ENV || 'development';
const isDevelopment = NODE_ENV === 'development';

// IP Whitelist for plugin
const WHITELISTED_IPS = (process.env.WHITELISTED_IPS || '127.0.0.1,::1').split(',').map(ip => ip.trim());

// Validate required environment variables
if (!MONGODB_URI) {
  console.error('❌ ERROR: MONGODB_URI environment variable is required!');
  process.exit(1);
}

// MongoDB client
let db = null;
let client = null;

async function connectToDatabase() {
  try {
    console.log('🔌 Conectando a MongoDB...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    const dbName = process.env.MONGODB_DATABASE || 'admin';
    db = client.db(dbName);
    console.log('✅ Conectado a MongoDB:', db.databaseName);
    return db;
  } catch (error) {
    console.error('❌ Error conectando a MongoDB:', error);
    throw error;
  }
}

function getDb() {
  if (!db) throw new Error('Database not initialized');
  return db;
}

// Generate verification code
function generateCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

// ============================================
// ADVANCED ECONOMIC AI PRICING SYSTEM
// Analyzes ALL economic aspects to prevent exploits
// ============================================

// Rarity configuration with economic multipliers
const RARITY_CONFIG = {
  'poke_ball': { rarity: 'common', multiplier: 0.15, minPrice: 50 },
  'great_ball': { rarity: 'common', multiplier: 0.25, minPrice: 100 },
  'ultra_ball': { rarity: 'uncommon', multiplier: 0.5, minPrice: 300 },
  'premier_ball': { rarity: 'common', multiplier: 0.15, minPrice: 50 },
  'luxury_ball': { rarity: 'uncommon', multiplier: 0.4, minPrice: 200 },
  'heal_ball': { rarity: 'common', multiplier: 0.2, minPrice: 75 },
  'net_ball': { rarity: 'uncommon', multiplier: 0.4, minPrice: 200 },
  'dive_ball': { rarity: 'uncommon', multiplier: 0.4, minPrice: 200 },
  'nest_ball': { rarity: 'uncommon', multiplier: 0.4, minPrice: 200 },
  'repeat_ball': { rarity: 'uncommon', multiplier: 0.4, minPrice: 200 },
  'timer_ball': { rarity: 'uncommon', multiplier: 0.4, minPrice: 200 },
  'quick_ball': { rarity: 'rare', multiplier: 0.7, minPrice: 500 },
  'dusk_ball': { rarity: 'uncommon', multiplier: 0.5, minPrice: 250 },
  'level_ball': { rarity: 'rare', multiplier: 1.0, minPrice: 800 },
  'lure_ball': { rarity: 'rare', multiplier: 1.0, minPrice: 800 },
  'moon_ball': { rarity: 'rare', multiplier: 1.0, minPrice: 800 },
  'friend_ball': { rarity: 'rare', multiplier: 1.0, minPrice: 800 },
  'love_ball': { rarity: 'rare', multiplier: 1.2, minPrice: 1000 },
  'heavy_ball': { rarity: 'rare', multiplier: 1.0, minPrice: 800 },
  'fast_ball': { rarity: 'rare', multiplier: 1.0, minPrice: 800 },
  'safari_ball': { rarity: 'rare', multiplier: 0.8, minPrice: 600 },
  'sport_ball': { rarity: 'rare', multiplier: 0.8, minPrice: 600 },
  'dream_ball': { rarity: 'epic', multiplier: 1.5, minPrice: 2000 },
  'beast_ball': { rarity: 'epic', multiplier: 2.5, minPrice: 5000 },
  'master_ball': { rarity: 'legendary', multiplier: 8.0, minPrice: 50000 },
};

// Dynamic price limits based on economy health
const PRICE_LIMITS = {
  common: { min: 50, max: 5000 },
  uncommon: { min: 150, max: 15000 },
  rare: { min: 500, max: 50000 },
  epic: { min: 2000, max: 200000 },
  legendary: { min: 50000, max: 1000000 },
};

// Stock ranges - rarer items have less stock
const STOCK_RANGES = {
  common: { min: 80, max: 200 },
  uncommon: { min: 30, max: 80 },
  rare: { min: 8, max: 25 },
  epic: { min: 2, max: 6 },
  legendary: { min: 0, max: 1 }, // Master ball very rare
};

// Statistical functions
function getMedian(arr) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function getPercentile(arr, percentile) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

function getStandardDeviation(arr) {
  if (arr.length === 0) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const squareDiffs = arr.map(value => Math.pow(value - mean, 2));
  return Math.sqrt(squareDiffs.reduce((a, b) => a + b, 0) / arr.length);
}

/**
 * ADVANCED ECONOMIC AI - Analyzes all aspects of the economy
 * - Player wealth distribution (Gini coefficient consideration)
 * - Inflation/deflation detection
 * - Purchase velocity
 * - Stock depletion rates
 * - Prevents economic exploits
 */
async function updateDynamicPrices() {
  try {
    const database = getDb();
    console.log('[ECONOMIC AI] Starting comprehensive economic analysis...');
    
    // ========================================
    // PHASE 1: Gather Economic Data
    // ========================================
    
    // Get all player balances
    const users = await database.collection('users').find({
      cobbleDollars: { $exists: true }
    }).toArray();

    const balances = users.map(u => u.cobbleDollars || 0).filter(b => b >= 0);
    
    if (balances.length === 0) {
      console.log('[ECONOMIC AI] No players with balance data, using minimum prices');
      return;
    }

    // Get recent purchase history (last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentPurchases = await database.collection('shop_purchases').find({
      createdAt: { $gte: oneDayAgo }
    }).toArray();

    // Get previous price history
    const lastPriceUpdate = await database.collection('price_history').findOne(
      {}, 
      { sort: { timestamp: -1 } }
    );

    // ========================================
    // PHASE 2: Economic Analysis
    // ========================================
    
    // Basic statistics
    const totalPlayers = balances.length;
    const totalWealth = balances.reduce((a, b) => a + b, 0);
    const averageBalance = totalWealth / totalPlayers;
    const medianBalance = getMedian(balances);
    const stdDeviation = getStandardDeviation(balances);
    
    // Wealth distribution analysis
    const p10 = getPercentile(balances, 10); // Poor players
    const p25 = getPercentile(balances, 25); // Lower middle
    const p50 = getPercentile(balances, 50); // Median
    const p75 = getPercentile(balances, 75); // Upper middle
    const p90 = getPercentile(balances, 90); // Rich players
    
    // Wealth inequality indicator (simplified Gini-like)
    const wealthGap = p90 > 0 ? (p90 - p10) / p90 : 0;
    
    // Purchase velocity (transactions per hour)
    const purchaseVelocity = recentPurchases.length / 24;
    
    // Total money spent in last 24h
    const totalSpent = recentPurchases.reduce((sum, p) => sum + (p.totalPrice || 0), 0);
    
    // Inflation indicator: if average balance is growing too fast
    const previousMedian = lastPriceUpdate?.medianBalance || medianBalance;
    const inflationRate = previousMedian > 0 ? (medianBalance - previousMedian) / previousMedian : 0;

    console.log(`[ECONOMIC AI] Analysis Results:`);
    console.log(`  - Players: ${totalPlayers}`);
    console.log(`  - Total Wealth: ${totalWealth.toLocaleString()}`);
    console.log(`  - Average Balance: ${Math.round(averageBalance).toLocaleString()}`);
    console.log(`  - Median Balance: ${medianBalance.toLocaleString()}`);
    console.log(`  - Wealth Gap (P90/P10): ${(wealthGap * 100).toFixed(1)}%`);
    console.log(`  - Purchase Velocity: ${purchaseVelocity.toFixed(2)}/hour`);
    console.log(`  - 24h Spending: ${totalSpent.toLocaleString()}`);
    console.log(`  - Inflation Rate: ${(inflationRate * 100).toFixed(2)}%`);

    // ========================================
    // PHASE 3: Calculate Base Price
    // ========================================
    
    // Use P25 (lower-middle class) as base to ensure accessibility
    // But adjust based on economic conditions
    let basePrice = p25;
    
    // Adjust for inflation/deflation
    if (inflationRate > 0.1) {
      // High inflation - increase prices to absorb excess money
      basePrice *= (1 + inflationRate * 0.5);
      console.log(`[ECONOMIC AI] Inflation detected, adjusting prices up`);
    } else if (inflationRate < -0.1) {
      // Deflation - decrease prices to stimulate economy
      basePrice *= (1 + inflationRate * 0.3);
      console.log(`[ECONOMIC AI] Deflation detected, adjusting prices down`);
    }
    
    // Adjust for wealth inequality
    if (wealthGap > 0.8) {
      // High inequality - use lower base to help poor players
      basePrice = Math.min(basePrice, p25);
      console.log(`[ECONOMIC AI] High inequality, using lower base price`);
    }
    
    // Minimum base price to prevent items being too cheap
    basePrice = Math.max(basePrice, 500);

    // ========================================
    // PHASE 4: Update Individual Item Prices
    // ========================================
    
    const shopItems = await database.collection('shop_items').find({}).toArray();
    const priceChanges = [];

    for (const item of shopItems) {
      const config = RARITY_CONFIG[item.id] || { rarity: 'uncommon', multiplier: 0.5, minPrice: 200 };
      const limits = PRICE_LIMITS[config.rarity] || { min: 100, max: 10000 };
      const stockRange = STOCK_RANGES[config.rarity] || { min: 10, max: 50 };

      // Calculate new price
      let newPrice = Math.round(basePrice * config.multiplier);
      
      // Apply minimum price from config
      newPrice = Math.max(newPrice, config.minPrice);
      
      // Apply rarity limits
      newPrice = Math.max(limits.min, Math.min(limits.max, newPrice));
      
      // Round to nice numbers
      if (newPrice < 500) newPrice = Math.round(newPrice / 25) * 25;
      else if (newPrice < 2000) newPrice = Math.round(newPrice / 50) * 50;
      else if (newPrice < 10000) newPrice = Math.round(newPrice / 100) * 100;
      else if (newPrice < 50000) newPrice = Math.round(newPrice / 500) * 500;
      else newPrice = Math.round(newPrice / 1000) * 1000;

      // Check item-specific purchase velocity
      const itemPurchases = recentPurchases.filter(p => p.ballId === item.id || p.ballId === item.cobblemonId);
      const itemVelocity = itemPurchases.length;
      
      // High demand = slightly higher price
      if (itemVelocity > 10) {
        newPrice = Math.round(newPrice * 1.1);
        console.log(`[ECONOMIC AI] High demand for ${item.name}, price +10%`);
      }

      // Calculate new stock (randomized within range)
      let newStock = Math.floor(Math.random() * (stockRange.max - stockRange.min + 1)) + stockRange.min;
      
      // Legendary items: only 1 if any, and only 20% chance
      if (config.rarity === 'legendary') {
        newStock = Math.random() < 0.2 ? 1 : 0;
      }

      const oldPrice = item.currentPrice || item.basePrice;
      priceChanges.push({
        item: item.name,
        oldPrice,
        newPrice,
        change: ((newPrice - oldPrice) / oldPrice * 100).toFixed(1) + '%'
      });

      await database.collection('shop_items').updateOne(
        { id: item.id },
        { 
          $set: { 
            currentPrice: newPrice,
            currentStock: newStock,
            maxStock: stockRange.max,
            lastPriceUpdate: new Date(),
          } 
        }
      );
    }

    // ========================================
    // PHASE 5: Save Economic Report
    // ========================================
    
    await database.collection('price_history').insertOne({
      timestamp: new Date(),
      playersAnalyzed: totalPlayers,
      totalWealth,
      averageBalance: Math.round(averageBalance),
      medianBalance,
      p10, p25, p50, p75, p90,
      wealthGap,
      purchaseVelocity,
      totalSpent24h: totalSpent,
      inflationRate,
      basePrice: Math.round(basePrice),
      priceChanges,
    });

    console.log(`[ECONOMIC AI] ✅ Updated ${shopItems.length} items based on economic analysis`);
    
  } catch (error) {
    console.error('[ECONOMIC AI] Error:', error);
  }
}

// Default Pokéballs for the shop - Using exact Cobblemon item IDs
function getDefaultPokeballs() {
  return [
    // Standard Balls
    {
      id: 'poke_ball',
      cobblemonId: 'poke_ball',
      name: 'Poké Ball',
      description: 'La Pokéball estándar. Tasa de captura básica.',
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png',
      type: 'standard',
      basePrice: 200,
      currentPrice: 200,
      currentStock: 100,
      maxStock: 100,
      catchRate: 1.0,
    },
    {
      id: 'great_ball',
      cobblemonId: 'great_ball',
      name: 'Great Ball',
      description: 'Mejor que una Poké Ball normal. 1.5x tasa de captura.',
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/great-ball.png',
      type: 'standard',
      basePrice: 600,
      currentPrice: 600,
      currentStock: 50,
      maxStock: 50,
      catchRate: 1.5,
    },
    {
      id: 'ultra_ball',
      cobblemonId: 'ultra_ball',
      name: 'Ultra Ball',
      description: 'Una de las mejores Pokéballs. 2x tasa de captura.',
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/ultra-ball.png',
      type: 'standard',
      basePrice: 1200,
      currentPrice: 1200,
      currentStock: 30,
      maxStock: 30,
      catchRate: 2.0,
    },
    {
      id: 'master_ball',
      cobblemonId: 'master_ball',
      name: 'Master Ball',
      description: '¡Captura garantizada! Extremadamente rara.',
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/master-ball.png',
      type: 'special',
      basePrice: 50000,
      currentPrice: 50000,
      currentStock: 1,
      maxStock: 1,
      catchRate: 255.0,
    },
    // Special Balls
    {
      id: 'premier_ball',
      cobblemonId: 'premier_ball',
      name: 'Premier Ball',
      description: 'Una Pokéball conmemorativa. Igual que una Poké Ball.',
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/premier-ball.png',
      type: 'special',
      basePrice: 200,
      currentPrice: 200,
      currentStock: 20,
      maxStock: 20,
      catchRate: 1.0,
    },
    {
      id: 'luxury_ball',
      cobblemonId: 'luxury_ball',
      name: 'Luxury Ball',
      description: 'El Pokémon capturado se vuelve más amigable.',
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/luxury-ball.png',
      type: 'special',
      basePrice: 1000,
      currentPrice: 1000,
      currentStock: 15,
      maxStock: 15,
      catchRate: 1.0,
    },
    // Situational Balls
    {
      id: 'net_ball',
      cobblemonId: 'net_ball',
      name: 'Net Ball',
      description: 'Efectiva contra Pokémon de tipo Agua y Bicho. 3.5x',
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/net-ball.png',
      type: 'situational',
      basePrice: 1000,
      currentPrice: 1000,
      currentStock: 25,
      maxStock: 25,
      catchRate: 3.5,
    },
    {
      id: 'dive_ball',
      cobblemonId: 'dive_ball',
      name: 'Dive Ball',
      description: 'Efectiva bajo el agua. 3.5x en agua.',
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/dive-ball.png',
      type: 'situational',
      basePrice: 1000,
      currentPrice: 1000,
      currentStock: 25,
      maxStock: 25,
      catchRate: 3.5,
    },
    {
      id: 'nest_ball',
      cobblemonId: 'nest_ball',
      name: 'Nest Ball',
      description: 'Más efectiva contra Pokémon de bajo nivel.',
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/nest-ball.png',
      type: 'situational',
      basePrice: 1000,
      currentPrice: 1000,
      currentStock: 25,
      maxStock: 25,
      catchRate: 4.0,
    },
    {
      id: 'repeat_ball',
      cobblemonId: 'repeat_ball',
      name: 'Repeat Ball',
      description: 'Efectiva contra Pokémon ya capturados. 3.5x',
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/repeat-ball.png',
      type: 'situational',
      basePrice: 1000,
      currentPrice: 1000,
      currentStock: 20,
      maxStock: 20,
      catchRate: 3.5,
    },
    {
      id: 'timer_ball',
      cobblemonId: 'timer_ball',
      name: 'Timer Ball',
      description: 'Más efectiva cuanto más dure el combate. Hasta 4x',
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/timer-ball.png',
      type: 'situational',
      basePrice: 1000,
      currentPrice: 1000,
      currentStock: 20,
      maxStock: 20,
      catchRate: 4.0,
    },
    {
      id: 'quick_ball',
      cobblemonId: 'quick_ball',
      name: 'Quick Ball',
      description: 'Muy efectiva al inicio del combate. 5x primer turno.',
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/quick-ball.png',
      type: 'situational',
      basePrice: 1000,
      currentPrice: 1000,
      currentStock: 20,
      maxStock: 20,
      catchRate: 5.0,
    },
    {
      id: 'dusk_ball',
      cobblemonId: 'dusk_ball',
      name: 'Dusk Ball',
      description: 'Efectiva de noche o en cuevas. 3x',
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/dusk-ball.png',
      type: 'situational',
      basePrice: 1000,
      currentPrice: 1000,
      currentStock: 25,
      maxStock: 25,
      catchRate: 3.0,
    },
    {
      id: 'heal_ball',
      cobblemonId: 'heal_ball',
      name: 'Heal Ball',
      description: 'Cura al Pokémon capturado completamente.',
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/heal-ball.png',
      type: 'special',
      basePrice: 300,
      currentPrice: 300,
      currentStock: 30,
      maxStock: 30,
      catchRate: 1.0,
    },
    // Apricorn Balls (raras)
    {
      id: 'level_ball',
      cobblemonId: 'level_ball',
      name: 'Level Ball',
      description: 'Más efectiva si tu Pokémon es de mayor nivel.',
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/level-ball.png',
      type: 'apricorn',
      basePrice: 2000,
      currentPrice: 2000,
      currentStock: 10,
      maxStock: 10,
      catchRate: 8.0,
    },
    {
      id: 'lure_ball',
      cobblemonId: 'lure_ball',
      name: 'Lure Ball',
      description: 'Efectiva contra Pokémon pescados. 4x',
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/lure-ball.png',
      type: 'apricorn',
      basePrice: 2000,
      currentPrice: 2000,
      currentStock: 10,
      maxStock: 10,
      catchRate: 4.0,
    },
    {
      id: 'moon_ball',
      cobblemonId: 'moon_ball',
      name: 'Moon Ball',
      description: 'Efectiva contra Pokémon que evolucionan con Piedra Lunar. 4x',
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/moon-ball.png',
      type: 'apricorn',
      basePrice: 2000,
      currentPrice: 2000,
      currentStock: 10,
      maxStock: 10,
      catchRate: 4.0,
    },
    {
      id: 'friend_ball',
      cobblemonId: 'friend_ball',
      name: 'Friend Ball',
      description: 'El Pokémon capturado empieza con alta amistad.',
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/friend-ball.png',
      type: 'apricorn',
      basePrice: 2000,
      currentPrice: 2000,
      currentStock: 10,
      maxStock: 10,
      catchRate: 1.0,
    },
    {
      id: 'love_ball',
      cobblemonId: 'love_ball',
      name: 'Love Ball',
      description: 'Efectiva contra Pokémon del sexo opuesto. 8x',
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/love-ball.png',
      type: 'apricorn',
      basePrice: 2000,
      currentPrice: 2000,
      currentStock: 10,
      maxStock: 10,
      catchRate: 8.0,
    },
    {
      id: 'heavy_ball',
      cobblemonId: 'heavy_ball',
      name: 'Heavy Ball',
      description: 'Efectiva contra Pokémon pesados.',
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/heavy-ball.png',
      type: 'apricorn',
      basePrice: 2000,
      currentPrice: 2000,
      currentStock: 10,
      maxStock: 10,
      catchRate: 4.0,
    },
    {
      id: 'fast_ball',
      cobblemonId: 'fast_ball',
      name: 'Fast Ball',
      description: 'Efectiva contra Pokémon rápidos (velocidad >100). 4x',
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/fast-ball.png',
      type: 'apricorn',
      basePrice: 2000,
      currentPrice: 2000,
      currentStock: 10,
      maxStock: 10,
      catchRate: 4.0,
    },
    // Safari/Sport/Dream
    {
      id: 'safari_ball',
      cobblemonId: 'safari_ball',
      name: 'Safari Ball',
      description: 'Ball especial de la Zona Safari. 1.5x',
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/safari-ball.png',
      type: 'special',
      basePrice: 1500,
      currentPrice: 1500,
      currentStock: 15,
      maxStock: 15,
      catchRate: 1.5,
    },
    {
      id: 'sport_ball',
      cobblemonId: 'sport_ball',
      name: 'Sport Ball',
      description: 'Ball especial del Bug-Catching Contest. 1.5x',
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/sport-ball.png',
      type: 'special',
      basePrice: 1500,
      currentPrice: 1500,
      currentStock: 15,
      maxStock: 15,
      catchRate: 1.5,
    },
    {
      id: 'dream_ball',
      cobblemonId: 'dream_ball',
      name: 'Dream Ball',
      description: 'Efectiva contra Pokémon dormidos. 4x',
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/dream-ball.png',
      type: 'special',
      basePrice: 2500,
      currentPrice: 2500,
      currentStock: 10,
      maxStock: 10,
      catchRate: 4.0,
    },
    {
      id: 'beast_ball',
      cobblemonId: 'beast_ball',
      name: 'Beast Ball',
      description: 'Diseñada para Ultra Bestias. 5x contra ellas, 0.1x contra otros.',
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/beast-ball.png',
      type: 'special',
      basePrice: 5000,
      currentPrice: 5000,
      currentStock: 5,
      maxStock: 5,
      catchRate: 5.0,
    },
  ];
}

function createApp() {
  const app = express();

  app.use(helmet({ contentSecurityPolicy: false }));

  const allowedOrigins = [
    FRONTEND_URL,
    'https://cobblemon-los-pitufos.vercel.app',
    'http://localhost:3000',
  ].filter(Boolean);

  app.use(cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      if (origin.endsWith('.vercel.app')) return callback(null, true);
      if (isDevelopment && origin.startsWith('http://localhost:')) return callback(null, true);
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With'],
  }));

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString(), uptime: process.uptime(), port: PORT, environment: NODE_ENV });
  });

  app.get('/server-status', (req, res) => {
    res.json({ status: 'online', timestamp: new Date().toISOString(), uptime: process.uptime() });
  });

  // API server status (for frontend)
  app.get('/api/server-status', (req, res) => {
    res.json({ 
      success: true,
      status: 'online', 
      timestamp: new Date().toISOString(), 
      uptime: process.uptime(),
      message: 'Backend API is running'
    });
  });

  // ============================================
  // PLUGIN ENDPOINTS - CRITICAL
  // ============================================

  // POST /api/players/sync - Sync player data from plugin
  app.post('/api/players/sync', async (req, res) => {
    try {
      const { uuid, username, online, party, pcStorage, cobbleDollars, cobbleDollarsBalance, badges, playtime, x, y, z, world } = req.body;
      if (!uuid || !username) {
        return res.status(400).json({ error: 'uuid and username required' });
      }

      const db = getDb();
      const user = await db.collection('users').findOne({ minecraftUuid: uuid });
      
      // Use cobbleDollarsBalance if cobbleDollars not provided (plugin sends cobbleDollarsBalance)
      const balance = cobbleDollars !== undefined ? cobbleDollars : cobbleDollarsBalance;

      if (!user) {
        // Create new user
        await db.collection('users').insertOne({
          minecraftUuid: uuid,
          minecraftUsername: username,
          online: online || false,
          party: party || [],
          pcStorage: pcStorage || [],
          cobbleDollars: balance || 0,
          badges: badges || 0,
          playtime: playtime || 0,
          x: x,
          y: y,
          z: z,
          world: world || 'overworld',
          verified: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        return res.json({ success: true, verified: false, banned: false });
      }

      // Update existing user
      const updateData = {
        minecraftUsername: username,
        online: online || false,
        updatedAt: new Date(),
      };
      
      // Only update these if provided
      if (party !== undefined) updateData.party = party;
      if (pcStorage !== undefined) updateData.pcStorage = pcStorage;
      if (balance !== undefined) updateData.cobbleDollars = balance;
      if (badges !== undefined) updateData.badges = badges;
      if (playtime !== undefined) updateData.playtime = playtime;
      if (x !== undefined) updateData.x = x;
      if (y !== undefined) updateData.y = y;
      if (z !== undefined) updateData.z = z;
      if (world !== undefined) updateData.world = world;

      await db.collection('users').updateOne(
        { minecraftUuid: uuid },
        { $set: updateData }
      );

      res.json({
        success: true,
        verified: user.verified || false,
        banned: user.banned || false,
        banReason: user.banReason,
      });
    } catch (error) {
      console.error('[PLAYERS SYNC] Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /api/admin/ban-status - Check if player is banned
  app.get('/api/admin/ban-status', async (req, res) => {
    try {
      const uuid = req.query.uuid;
      if (!uuid) {
        return res.status(400).json({ error: 'uuid required' });
      }

      const db = getDb();
      const user = await db.collection('users').findOne({ minecraftUuid: uuid });

      if (!user) {
        return res.json({ banned: false });
      }

      res.json({
        banned: user.banned || false,
        banReason: user.banReason,
      });
    } catch (error) {
      console.error('[BAN STATUS] Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ============================================
  // NEW VERIFICATION FLOW (Web → In-Game)
  // Code generated on WEB after gacha roll
  // Player uses /verify <code> in-game to link accounts
  // ============================================

  // POST /api/verification/generate-web - Generate code from WEB (after Discord auth + gacha)
  app.post('/api/verification/generate-web', async (req, res) => {
    try {
      const { discordId, discordUsername } = req.body;
      if (!discordId) {
        return res.status(400).json({ error: 'discordId required' });
      }

      const db = getDb();
      
      // Check if already verified
      const existingUser = await db.collection('users').findOne({ discordId });
      if (existingUser && existingUser.verified && existingUser.minecraftUuid) {
        return res.json({ 
          success: true, 
          alreadyVerified: true,
          minecraftUsername: existingUser.minecraftUsername 
        });
      }

      // Generate 5-digit code (easy to type in-game)
      const code = Math.floor(10000 + Math.random() * 90000).toString();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      // Store code linked to discordId (waiting for Minecraft link)
      await db.collection('verification_codes').updateOne(
        { discordId },
        {
          $set: {
            discordId,
            discordUsername: discordUsername || discordId,
            code,
            expiresAt,
            createdAt: new Date(),
            used: false,
          },
        },
        { upsert: true }
      );

      console.log(`[VERIFICATION] Generated web code ${code} for Discord ${discordUsername || discordId}`);
      res.json({ success: true, code, expiresAt });
    } catch (error) {
      console.error('[VERIFICATION GENERATE WEB] Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /api/verification/link - Link Minecraft to Discord via code (called from plugin)
  app.post('/api/verification/link', async (req, res) => {
    try {
      const { minecraftUuid, minecraftUsername, code } = req.body;
      if (!minecraftUuid || !code) {
        return res.status(400).json({ error: 'minecraftUuid and code required' });
      }

      const db = getDb();
      
      // Find the verification code
      const verificationEntry = await db.collection('verification_codes').findOne({ 
        code: code.toString(),
        used: false 
      });

      if (!verificationEntry) {
        return res.json({ success: false, message: 'Código inválido o ya usado' });
      }

      if (new Date() > new Date(verificationEntry.expiresAt)) {
        return res.json({ success: false, message: 'Código expirado. Genera uno nuevo en la web.' });
      }

      const discordId = verificationEntry.discordId;
      const discordUsername = verificationEntry.discordUsername;

      // Check if this Minecraft account is already linked to another Discord
      const existingMcUser = await db.collection('users').findOne({ minecraftUuid });
      if (existingMcUser && existingMcUser.discordId && existingMcUser.discordId !== discordId) {
        return res.json({ 
          success: false, 
          message: 'Esta cuenta de Minecraft ya está vinculada a otro Discord' 
        });
      }

      // Check if this Discord is already linked to another Minecraft
      const existingDiscordUser = await db.collection('users').findOne({ discordId });
      if (existingDiscordUser && existingDiscordUser.minecraftUuid && existingDiscordUser.minecraftUuid !== minecraftUuid) {
        return res.json({ 
          success: false, 
          message: 'Este Discord ya está vinculado a otra cuenta de Minecraft' 
        });
      }

      // Link accounts - merge or create user
      await db.collection('users').updateOne(
        { $or: [{ discordId }, { minecraftUuid }] },
        {
          $set: {
            discordId,
            discordUsername,
            minecraftUuid,
            minecraftUsername,
            verified: true,
            verifiedAt: new Date(),
            updatedAt: new Date(),
          },
          $setOnInsert: {
            createdAt: new Date(),
            cobbleDollars: 0,
          },
        },
        { upsert: true }
      );

      // Mark code as used
      await db.collection('verification_codes').updateOne(
        { code },
        { $set: { used: true, usedAt: new Date(), linkedMinecraftUuid: minecraftUuid } }
      );

      console.log(`[VERIFICATION] Linked ${minecraftUsername} (${minecraftUuid}) to Discord ${discordUsername} (${discordId})`);
      
      res.json({ 
        success: true, 
        message: '¡Cuenta vinculada exitosamente!',
        discordUsername 
      });
    } catch (error) {
      console.error('[VERIFICATION LINK] Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /api/verification/status - Check if user is verified (for web polling)
  app.get('/api/verification/status', async (req, res) => {
    try {
      const { discordId, code } = req.query;
      
      if (!discordId && !code) {
        return res.status(400).json({ error: 'discordId or code required' });
      }

      const db = getDb();
      
      if (code) {
        // Check by code
        const verificationEntry = await db.collection('verification_codes').findOne({ code });
        if (!verificationEntry) {
          return res.json({ valid: false, message: 'Code not found' });
        }
        
        if (verificationEntry.used) {
          const user = await db.collection('users').findOne({ discordId: verificationEntry.discordId });
          return res.json({ 
            valid: true, 
            verified: true, 
            minecraftUsername: user?.minecraftUsername 
          });
        }
        
        return res.json({ 
          valid: true, 
          verified: false,
          expired: new Date() > new Date(verificationEntry.expiresAt)
        });
      }
      
      // Check by discordId
      const user = await db.collection('users').findOne({ discordId });
      res.json({
        verified: user?.verified || false,
        minecraftUsername: user?.minecraftUsername,
        minecraftUuid: user?.minecraftUuid,
      });
    } catch (error) {
      console.error('[VERIFICATION STATUS] Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // LEGACY: POST /api/verification/generate - Generate verification code (old flow, keep for compatibility)
  app.post('/api/verification/generate', async (req, res) => {
    try {
      const { minecraftUuid, minecraftUsername } = req.body;
      if (!minecraftUuid || !minecraftUsername) {
        return res.status(400).json({ error: 'minecraftUuid and minecraftUsername required' });
      }

      const db = getDb();
      const code = generateCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      await db.collection('users').updateOne(
        { minecraftUuid },
        {
          $set: {
            minecraftUuid,
            minecraftUsername,
            verificationCode: code,
            verificationCodeExpiresAt: expiresAt,
            updatedAt: new Date(),
          },
          $setOnInsert: {
            createdAt: new Date(),
            verified: false,
          },
        },
        { upsert: true }
      );

      res.json({ success: true, code });
    } catch (error) {
      console.error('[VERIFICATION GENERATE] Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // LEGACY: POST /api/verification/verify - Verify code from plugin (old flow)
  app.post('/api/verification/verify', async (req, res) => {
    try {
      const { minecraftUuid, code } = req.body;
      if (!minecraftUuid || !code) {
        return res.status(400).json({ error: 'minecraftUuid and code required' });
      }

      const db = getDb();
      const user = await db.collection('users').findOne({ minecraftUuid });

      if (!user) {
        return res.json({ success: false, message: 'User not found' });
      }

      if (user.verified) {
        return res.json({ success: true, message: 'Already verified' });
      }

      if (user.verificationCode !== code) {
        return res.json({ success: false, message: 'Invalid code' });
      }

      if (new Date() > new Date(user.verificationCodeExpiresAt)) {
        return res.json({ success: false, message: 'Code expired' });
      }

      // Check if Discord is linked
      if (!user.discordId) {
        return res.json({ success: false, message: 'Discord not linked yet' });
      }

      // Mark as verified
      await db.collection('users').updateOne(
        { minecraftUuid },
        {
          $set: {
            verified: true,
            verifiedAt: new Date(),
            updatedAt: new Date(),
          },
          $unset: {
            verificationCode: '',
            verificationCodeExpiresAt: '',
          },
        }
      );

      res.json({ success: true, message: 'Verified successfully' });
    } catch (error) {
      console.error('[VERIFICATION VERIFY] Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /api/gacha/delivery/status - Check starter delivery status
  app.get('/api/gacha/delivery/status', async (req, res) => {
    try {
      const uuid = req.query.uuid;
      if (!uuid) {
        return res.status(400).json({ error: 'uuid required' });
      }

      const db = getDb();
      const user = await db.collection('users').findOne({ minecraftUuid: uuid });

      if (!user) {
        return res.json({ deliveryInProgress: false, hasPendingStarter: false });
      }

      res.json({
        deliveryInProgress: user.starterDeliveryInProgress || false,
        hasPendingStarter: user.starterClaimed && !user.starterDelivered,
        starterId: user.starterId,
        starterIsShiny: user.starterIsShiny || false,
      });
    } catch (error) {
      console.error('[DELIVERY STATUS] Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /api/gacha/delivery/start - Mark delivery as started
  app.post('/api/gacha/delivery/start', async (req, res) => {
    try {
      const { uuid } = req.body;
      if (!uuid) {
        return res.status(400).json({ error: 'uuid required' });
      }

      const db = getDb();
      await db.collection('users').updateOne(
        { minecraftUuid: uuid },
        { $set: { starterDeliveryInProgress: true, updatedAt: new Date() } }
      );

      res.json({ success: true });
    } catch (error) {
      console.error('[DELIVERY START] Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /api/gacha/delivery/success - Mark delivery as successful
  app.post('/api/gacha/delivery/success', async (req, res) => {
    try {
      const { uuid } = req.body;
      if (!uuid) {
        return res.status(400).json({ error: 'uuid required' });
      }

      const db = getDb();
      await db.collection('users').updateOne(
        { minecraftUuid: uuid },
        {
          $set: {
            starterDelivered: true,
            starterDeliveryInProgress: false,
            starterDeliveredAt: new Date(),
            updatedAt: new Date(),
          },
        }
      );

      res.json({ success: true });
    } catch (error) {
      console.error('[DELIVERY SUCCESS] Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /api/gacha/delivery/failed - Mark delivery as failed
  app.post('/api/gacha/delivery/failed', async (req, res) => {
    try {
      const { uuid, reason } = req.body;
      if (!uuid) {
        return res.status(400).json({ error: 'uuid required' });
      }

      const db = getDb();
      await db.collection('users').updateOne(
        { minecraftUuid: uuid },
        {
          $set: {
            starterDeliveryInProgress: false,
            starterDeliveryFailedReason: reason,
            updatedAt: new Date(),
          },
        }
      );

      res.json({ success: true });
    } catch (error) {
      console.error('[DELIVERY FAILED] Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /api/level-caps/version - Get level caps config version
  app.get('/api/level-caps/version', async (req, res) => {
    try {
      const db = getDb();
      const config = await db.collection('level_caps').findOne({});

      res.json({
        version: config?.version || 1,
        lastUpdated: config?.lastModified || config?.updatedAt || new Date(),
      });
    } catch (error) {
      console.error('[LEVEL CAPS VERSION] Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /api/level-caps/effective - Get effective caps for player
  app.get('/api/level-caps/effective', async (req, res) => {
    try {
      const uuid = req.query.uuid;
      if (!uuid) {
        return res.status(400).json({ error: 'uuid required' });
      }

      const db = getDb();
      const config = await db.collection('level_caps').findOne({});

      // Default caps if no config
      if (!config) {
        return res.json({
          success: true,
          captureCap: 100,
          ownershipCap: 100,
          appliedRules: [],
          calculatedAt: new Date(),
        });
      }

      // For now, return global defaults
      // TODO: Implement full formula evaluation
      res.json({
        success: true,
        captureCap: config.globalConfig?.defaultCaptureCap || 100,
        ownershipCap: config.globalConfig?.defaultOwnershipCap || 100,
        appliedRules: [],
        calculatedAt: new Date(),
      });
    } catch (error) {
      console.error('[LEVEL CAPS EFFECTIVE] Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // PUT /api/level-caps/config - Update level caps config (admin)
  app.put('/api/level-caps/config', async (req, res) => {
    try {
      const db = getDb();
      const existing = await db.collection('level_caps').findOne({});
      const newVersion = (existing?.version || 0) + 1;

      await db.collection('level_caps').updateOne(
        {},
        {
          $set: {
            ...req.body,
            version: newVersion,
            lastModified: new Date(),
            updatedAt: new Date(),
          },
        },
        { upsert: true }
      );

      const updated = await db.collection('level_caps').findOne({});
      console.log(`[LEVEL CAPS] Config updated to version ${newVersion}`);
      res.json(updated);
    } catch (error) {
      console.error('[LEVEL CAPS CONFIG] Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /api/shop/purchases - Get pending purchases for player
  app.get('/api/shop/purchases', async (req, res) => {
    try {
      const uuid = req.query.uuid;
      if (!uuid) {
        return res.status(400).json({ error: 'uuid required' });
      }

      const db = getDb();
      const purchases = await db.collection('shop_purchases')
        .find({ minecraftUuid: uuid, status: 'pending' })
        .toArray();

      res.json({ success: true, purchases });
    } catch (error) {
      console.error('[SHOP PURCHASES] Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /api/shop/claim - Claim a purchase
  app.post('/api/shop/claim', async (req, res) => {
    try {
      const { uuid, purchaseId } = req.body;
      if (!uuid || !purchaseId) {
        return res.status(400).json({ error: 'uuid and purchaseId required' });
      }

      const db = getDb();
      const result = await db.collection('shop_purchases').updateOne(
        { _id: new require('mongodb').ObjectId(purchaseId), minecraftUuid: uuid, status: 'pending' },
        { $set: { status: 'claimed', claimedAt: new Date() } }
      );

      if (result.modifiedCount === 0) {
        return res.status(404).json({ error: 'Purchase not found or already claimed' });
      }

      res.json({ success: true });
    } catch (error) {
      console.error('[SHOP CLAIM] Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ============================================
  // WEB ENDPOINTS
  // ============================================

  // GET /api/verify/check - Check verification code status (web polling)
  app.get('/api/verify/check', async (req, res) => {
    try {
      const code = req.query.code;
      if (!code) {
        return res.status(400).json({ error: 'code required' });
      }

      const db = getDb();
      const user = await db.collection('users').findOne({ verificationCode: code });

      if (!user) {
        return res.json({ valid: false, message: 'Code not found' });
      }

      if (new Date() > new Date(user.verificationCodeExpiresAt)) {
        return res.json({ valid: false, message: 'Code expired' });
      }

      res.json({
        valid: true,
        minecraftUsername: user.minecraftUsername,
        verified: user.verified || false,
      });
    } catch (error) {
      console.error('[VERIFY CHECK] Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /api/verify/check - Verify code from web and link Discord
  app.post('/api/verify/check', async (req, res) => {
    try {
      const { code, discordId, discordUsername } = req.body;
      if (!code || !discordId) {
        return res.status(400).json({ error: 'code and discordId required' });
      }

      const db = getDb();
      const user = await db.collection('users').findOne({ verificationCode: code });

      if (!user) {
        return res.json({ success: false, message: 'Code not found' });
      }

      if (new Date() > new Date(user.verificationCodeExpiresAt)) {
        return res.json({ success: false, message: 'Code expired' });
      }

      // Link Discord account
      await db.collection('users').updateOne(
        { verificationCode: code },
        {
          $set: {
            discordId,
            discordUsername: discordUsername || discordId,
            verified: true,
            verifiedAt: new Date(),
            updatedAt: new Date(),
          },
          $unset: {
            verificationCode: '',
            verificationCodeExpiresAt: '',
          },
        }
      );

      res.json({
        success: true,
        message: 'Account linked successfully',
        minecraftUsername: user.minecraftUsername,
      });
    } catch (error) {
      console.error('[VERIFY CHECK POST] Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /api/starters - Get all starters
  app.get('/api/starters', async (req, res) => {
    try {
      const starters = await getDb().collection('starters').find({}).toArray();
      res.json({ starters });
    } catch (error) {
      console.error('[STARTERS] Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /api/players - Get all players
  app.get('/api/players', async (req, res) => {
    try {
      const users = await getDb().collection('users').find({}).toArray();
      
      // Transformar a formato esperado por el frontend
      const players = users.map(user => ({
        uuid: user.minecraftUuid || user._id.toString(),
        username: user.minecraftUsername || user.discordUsername || 'Unknown',
        totalPokemon: (user.party?.length || 0) + (user.pcStorage?.length || 0),
        shinies: [...(user.party || []), ...(user.pcStorage || [])].filter(p => p?.shiny).length,
        starter: user.starterId ? {
          id: user.starterId,
          name: user.starterName || `Pokemon #${user.starterId}`,
          isShiny: user.starterIsShiny || false,
        } : null,
        partyPreview: (user.party || []).slice(0, 6).map(p => ({
          species: p?.species || 'Unknown',
          speciesId: p?.speciesId || 1,
          level: p?.level || 1,
          shiny: p?.shiny || false,
        })),
        cobbleDollars: user.cobbleDollars || 0,
        badges: user.badges || 0,
        playtime: user.playtime || 0,
        online: user.online || false,
        verified: user.verified || false,
        // Coordenadas para el mapa
        x: user.x,
        y: user.y,
        z: user.z,
        world: user.world || 'overworld',
      }));
      
      res.json({ players });
    } catch (error) {
      console.error('[PLAYERS] Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /api/players/:uuid - Get player profile
  app.get('/api/players/:uuid', async (req, res) => {
    try {
      const { uuid } = req.params;
      const db = getDb();
      const user = await db.collection('users').findOne({ minecraftUuid: uuid });

      if (!user) {
        return res.status(404).json({ error: 'Player not found' });
      }

      res.json({ success: true, profile: user });
    } catch (error) {
      console.error('[PLAYER PROFILE] Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /api/tournaments - Get all tournaments
  app.get('/api/tournaments', async (req, res) => {
    try {
      const tournaments = await getDb().collection('tournaments').find({}).toArray();
      tournaments.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
      res.json({ tournaments });
    } catch (error) {
      console.error('[TOURNAMENTS] Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /api/shop/stock - Get shop stock (Pokéballs)
  app.get('/api/shop/stock', async (req, res) => {
    try {
      const db = getDb();
      let items = await db.collection('shop_items').find({}).toArray();
      
      // Si no hay items, crear los defaults
      if (items.length === 0) {
        const defaultBalls = getDefaultPokeballs();
        await db.collection('shop_items').insertMany(defaultBalls);
        items = defaultBalls;
      }
      
      // Transformar al formato esperado por el frontend
      const balls = items.map(item => ({
        id: item.id || item.ballId,
        name: item.name,
        description: item.description,
        sprite: item.sprite,
        spriteOpen: item.spriteOpen,
        type: item.type || 'standard',
        basePrice: item.basePrice,
        currentPrice: item.currentPrice || item.basePrice,
        currentStock: item.currentStock,
        maxStock: item.maxStock,
        catchRate: item.catchRate,
        cobblemonId: item.cobblemonId, // ID exacto para Cobblemon
      }));
      
      res.json({ balls });
    } catch (error) {
      console.error('[SHOP STOCK] Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /api/shop/purchase - Purchase pokeballs
  // ECONOMIC PROTECTION: Anti-exploit measures
  app.post('/api/shop/purchase', async (req, res) => {
    try {
      const { uuid, itemId, quantity } = req.body;
      if (!uuid || !itemId || !quantity) {
        return res.status(400).json({ error: 'uuid, itemId and quantity required' });
      }

      // PROTECTION 1: Quantity limits per transaction
      const parsedQuantity = parseInt(quantity);
      if (isNaN(parsedQuantity) || parsedQuantity < 1 || parsedQuantity > 64) {
        return res.status(400).json({ error: 'Invalid quantity (1-64 per transaction)' });
      }

      const db = getDb();
      
      // PROTECTION 2: User must be verified
      const user = await db.collection('users').findOne({ minecraftUuid: uuid });
      if (!user) {
        return res.status(404).json({ error: 'User not found. You need to be verified.' });
      }
      
      if (!user.verified) {
        return res.status(403).json({ error: 'You must verify your account first.' });
      }

      // PROTECTION 3: Rate limiting - max 10 purchases per minute per user
      const oneMinuteAgo = new Date(Date.now() - 60000);
      const recentPurchases = await db.collection('shop_purchases').countDocuments({
        minecraftUuid: uuid,
        createdAt: { $gte: oneMinuteAgo }
      });
      
      if (recentPurchases >= 10) {
        return res.status(429).json({ error: 'Too many purchases. Wait a minute.' });
      }

      // PROTECTION 4: Daily spending limit (prevent economy drain)
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      
      const dailySpending = await db.collection('shop_purchases').aggregate([
        { $match: { minecraftUuid: uuid, createdAt: { $gte: todayStart } } },
        { $group: { _id: null, total: { $sum: '$totalPrice' } } }
      ]).toArray();
      
      const spentToday = dailySpending[0]?.total || 0;
      const dailyLimit = 500000; // 500k daily limit
      
      // Buscar el item
      const item = await db.collection('shop_items').findOne({ 
        $or: [{ id: itemId }, { ballId: itemId }] 
      });
      if (!item) {
        return res.status(404).json({ error: 'Item not found' });
      }

      // Calcular precio total
      const totalPrice = (item.currentPrice || item.basePrice) * parsedQuantity;

      // PROTECTION 5: Check daily limit
      if (spentToday + totalPrice > dailyLimit) {
        const remaining = dailyLimit - spentToday;
        return res.status(400).json({ 
          error: `Daily spending limit reached. Remaining today: ${remaining} CobbleDollars` 
        });
      }

      // PROTECTION 6: Verify stock (with fresh read)
      const freshItem = await db.collection('shop_items').findOne({ 
        $or: [{ id: itemId }, { ballId: itemId }] 
      });
      
      if (!freshItem || freshItem.currentStock < parsedQuantity) {
        return res.status(400).json({ error: `Not enough stock. Available: ${freshItem?.currentStock || 0}` });
      }

      // PROTECTION 7: Verify balance (with fresh read to prevent race conditions)
      const freshUser = await db.collection('users').findOne({ minecraftUuid: uuid });
      const userBalance = freshUser?.cobbleDollars || 0;
      
      if (userBalance < totalPrice) {
        return res.status(400).json({ 
          error: `Insufficient balance. Need: ${totalPrice}, Have: ${userBalance}` 
        });
      }

      // PROTECTION 8: Atomic transaction using MongoDB transactions if available
      // For now, use optimistic locking with version check
      const newBalance = userBalance - totalPrice;
      const newStock = freshItem.currentStock - parsedQuantity;

      // Prevent negative balance (double-check)
      if (newBalance < 0) {
        return res.status(400).json({ error: 'Transaction would result in negative balance' });
      }

      // Prevent negative stock
      if (newStock < 0) {
        return res.status(400).json({ error: 'Transaction would result in negative stock' });
      }

      // Update balance with optimistic lock
      const balanceUpdate = await db.collection('users').updateOne(
        { minecraftUuid: uuid, cobbleDollars: userBalance }, // Only update if balance hasn't changed
        { $set: { cobbleDollars: newBalance, updatedAt: new Date() } }
      );

      if (balanceUpdate.modifiedCount === 0) {
        return res.status(409).json({ error: 'Balance changed during transaction. Please try again.' });
      }

      // Update stock with optimistic lock
      const stockUpdate = await db.collection('shop_items').updateOne(
        { $or: [{ id: itemId }, { ballId: itemId }], currentStock: freshItem.currentStock },
        { $set: { currentStock: newStock, updatedAt: new Date() } }
      );

      if (stockUpdate.modifiedCount === 0) {
        // Rollback balance
        await db.collection('users').updateOne(
          { minecraftUuid: uuid },
          { $inc: { cobbleDollars: totalPrice } }
        );
        return res.status(409).json({ error: 'Stock changed during transaction. Please try again.' });
      }

      // Create purchase record
      const purchase = {
        minecraftUuid: uuid,
        minecraftUsername: user.minecraftUsername,
        discordId: user.discordId,
        ballId: item.cobblemonId || item.id || itemId,
        ballName: item.name,
        quantity: parsedQuantity,
        pricePerUnit: item.currentPrice || item.basePrice,
        totalPrice: totalPrice,
        status: 'pending',
        createdAt: new Date(),
      };

      await db.collection('shop_purchases').insertOne(purchase);

      console.log(`[SHOP] Purchase: ${user.minecraftUsername} bought ${parsedQuantity}x ${item.name} for ${totalPrice} CobbleDollars (Balance: ${newBalance})`);

      res.json({
        success: true,
        message: `¡Compra exitosa! Recibirás ${parsedQuantity}x ${item.name} automáticamente en el juego.`,
        newBalance: newBalance,
        purchase: {
          itemName: item.name,
          quantity: parsedQuantity,
          totalPrice: totalPrice,
        }
      });
    } catch (error) {
      console.error('[SHOP PURCHASE] Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /api/shop/balance - Get player balance
  app.get('/api/shop/balance', async (req, res) => {
    try {
      const { discordId, uuid } = req.query;
      if (!discordId && !uuid) {
        return res.status(400).json({ error: 'discordId or uuid required' });
      }

      const db = getDb();
      // Buscar por discordId o minecraftUuid
      const query = discordId ? { discordId } : { minecraftUuid: uuid };
      const user = await db.collection('users').findOne(query);

      res.json({
        success: true,
        balance: user?.cobbleDollars || 0,
        discordId: user?.discordId,
        minecraftUuid: user?.minecraftUuid,
      });
    } catch (error) {
      console.error('[SHOP BALANCE] Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /api/gacha/roll - Check roll status
  app.get('/api/gacha/roll', async (req, res) => {
    try {
      const discordId = req.query.discordId;
      if (!discordId) {
        return res.status(400).json({ error: 'discordId required' });
      }

      const db = getDb();
      const user = await db.collection('users').findOne({ discordId });
      
      // CRITICAL: Check if user has EVER claimed a starter
      // This prevents re-rolling even if they delete their account
      const hasRolled = user && (user.starterClaimed === true || user.starterId);
      
      // Also check if this Discord has claimed any starter in the starters collection
      const claimedStarter = await db.collection('starters').findOne({ claimedBy: discordId });
      const hasClaimedAnyStarter = !!claimedStarter;
      
      // User cannot roll if they have claimed OR if their Discord is linked to a claimed starter
      const cannotRoll = hasRolled || hasClaimedAnyStarter;
      
      // Contar starters disponibles y totales
      const totalCount = await db.collection('starters').countDocuments({});
      const availableCount = await db.collection('starters').countDocuments({ isClaimed: false });

      let starter = null;
      if (cannotRoll) {
        // Try to find their starter
        if (user?.starterId) {
          starter = await db.collection('starters').findOne({ pokemonId: user.starterId });
        } else if (claimedStarter) {
          starter = claimedStarter;
        }
      }

      console.log(`[GACHA STATUS] User ${discordId}: hasRolled=${hasRolled}, hasClaimedAnyStarter=${hasClaimedAnyStarter}, canRoll=${!cannotRoll}`);

      res.json({
        canRoll: !cannotRoll && availableCount > 0,
        hasRolled: cannotRoll,
        starter,
        isShiny: user?.starterIsShiny || claimedStarter?.isShiny || false,
        availableCount,
        totalCount: totalCount || 27,
      });
    } catch (error) {
      console.error('[GACHA ROLL STATUS] Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /api/gacha/roll - Perform classic roll
  app.post('/api/gacha/roll', async (req, res) => {
    try {
      const { discordId, discordUsername } = req.body;
      if (!discordId) {
        return res.status(400).json({ error: 'discordId required' });
      }

      const db = getDb();
      
      // CRITICAL: Double-check user hasn't already claimed
      const user = await db.collection('users').findOne({ discordId });
      if (user && (user.starterClaimed || user.starterId)) {
        console.log(`[GACHA] BLOCKED: User ${discordId} already has starter`);
        return res.status(400).json({ error: 'Ya has reclamado tu starter. Solo puedes tener uno.' });
      }

      // Also check starters collection
      const existingClaim = await db.collection('starters').findOne({ claimedBy: discordId });
      if (existingClaim) {
        console.log(`[GACHA] BLOCKED: User ${discordId} found in starters collection`);
        return res.status(400).json({ error: 'Ya has reclamado tu starter. Solo puedes tener uno.' });
      }

      const availableStarters = await db.collection('starters').find({ isClaimed: false }).toArray();
      if (availableStarters.length === 0) {
        return res.status(400).json({ error: 'No hay starters disponibles' });
      }

      const starter = availableStarters[Math.floor(Math.random() * availableStarters.length)];
      const isShiny = Math.random() < (1 / 4096);

      // Mark starter as claimed
      await db.collection('starters').updateOne(
        { _id: starter._id },
        { $set: { isClaimed: true, claimedBy: discordId, claimedByNickname: discordUsername, claimedAt: new Date(), isShiny } }
      );

      // Update user record
      await db.collection('users').updateOne(
        { discordId },
        { 
          $set: { 
            starterClaimed: true, 
            starterId: starter.pokemonId, 
            starterIsShiny: isShiny, 
            starterClaimedAt: new Date(),
            discordUsername: discordUsername,
          } 
        },
        { upsert: true }
      );

      console.log(`[GACHA] SUCCESS: ${discordUsername} (${discordId}) claimed ${starter.nameEs || starter.name} (shiny: ${isShiny})`);

      res.json({ starter, isShiny });
    } catch (error) {
      console.error('[GACHA ROLL] Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /api/gacha/soul-driven - Soul driven roll
  app.post('/api/gacha/soul-driven', async (req, res) => {
    try {
      const { discordId, discordUsername, answers } = req.body;
      if (!discordId || !answers) {
        return res.status(400).json({ error: 'discordId and answers required' });
      }

      const db = getDb();
      
      // CRITICAL: Double-check user hasn't already claimed
      const user = await db.collection('users').findOne({ discordId });
      if (user && (user.starterClaimed || user.starterId)) {
        console.log(`[SOUL-DRIVEN] BLOCKED: User ${discordId} already has starter`);
        return res.status(400).json({ error: 'Ya has reclamado tu starter. Solo puedes tener uno.' });
      }

      // Also check starters collection
      const existingClaim = await db.collection('starters').findOne({ claimedBy: discordId });
      if (existingClaim) {
        console.log(`[SOUL-DRIVEN] BLOCKED: User ${discordId} found in starters collection`);
        return res.status(400).json({ error: 'Ya has reclamado tu starter. Solo puedes tener uno.' });
      }

      const availableStarters = await db.collection('starters').find({ isClaimed: false }).toArray();
      if (availableStarters.length === 0) {
        return res.status(400).json({ error: 'No hay starters disponibles' });
      }

      // TODO: Implement actual soul-driven logic based on answers
      const starter = availableStarters[Math.floor(Math.random() * availableStarters.length)];
      const isShiny = Math.random() < (1 / 4096);

      await db.collection('starters').updateOne(
        { _id: starter._id },
        { $set: { isClaimed: true, claimedBy: discordId, claimedByNickname: discordUsername, claimedAt: new Date(), isShiny } }
      );

      await db.collection('users').updateOne(
        { discordId },
        { 
          $set: { 
            starterClaimed: true, 
            starterId: starter.pokemonId, 
            starterIsShiny: isShiny, 
            starterClaimedAt: new Date(), 
            soulDrivenAnswers: answers,
            discordUsername: discordUsername,
          } 
        },
        { upsert: true }
      );

      console.log(`[SOUL-DRIVEN] SUCCESS: ${discordUsername} (${discordId}) claimed ${starter.nameEs || starter.name} (shiny: ${isShiny})`);

      res.json({ starter, isShiny });
    } catch (error) {
      console.error('[SOUL DRIVEN] Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Discord Auth
  app.get('/api/auth/discord', (req, res) => {
    const clientId = process.env.DISCORD_CLIENT_ID;
    const redirectUri = process.env.DISCORD_REDIRECT_URI || `https://api.playadoradarp.xyz/port/25617/api/auth/discord/callback`;
    const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=identify%20email`;
    res.redirect(discordAuthUrl);
  });

  app.get('/api/auth/discord/callback', async (req, res) => {
    const { code } = req.query;
    if (!code) return res.redirect(`${FRONTEND_URL}?auth=error`);

    try {
      const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.DISCORD_CLIENT_ID,
          client_secret: process.env.DISCORD_CLIENT_SECRET,
          grant_type: 'authorization_code',
          code,
          redirect_uri: process.env.DISCORD_REDIRECT_URI || `https://api.playadoradarp.xyz/port/25617/api/auth/discord/callback`,
        }),
      });

      const tokenData = await tokenResponse.json();
      if (!tokenData.access_token) return res.redirect(`${FRONTEND_URL}?auth=error`);

      const userResponse = await fetch('https://discord.com/api/users/@me', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });

      const userData = await userResponse.json();

      await getDb().collection('users').updateOne(
        { discordId: userData.id },
        {
          $set: {
            discordId: userData.id,
            discordUsername: userData.global_name || userData.username,
            avatar: userData.avatar ? `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png` : null,
            email: userData.email,
            lastLogin: new Date(),
          },
        },
        { upsert: true }
      );

      const userForFrontend = {
        discordId: userData.id,
        discordUsername: userData.global_name || userData.username,
        avatar: userData.avatar ? `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png` : null,
      };

      res.redirect(`${FRONTEND_URL}/auth/callback?user=${encodeURIComponent(JSON.stringify(userForFrontend))}`);
    } catch (error) {
      console.error('Discord auth error:', error);
      res.redirect(`${FRONTEND_URL}/auth/callback?error=${encodeURIComponent('Error al autenticar')}`);
    }
  });

  // Admin endpoints
  app.post('/api/admin/ban', async (req, res) => {
    try {
      const { uuid, banReason, ban } = req.body;
      const db = getDb();

      if (ban) {
        await db.collection('users').updateOne(
          { minecraftUuid: uuid },
          { $set: { banned: true, banReason, bannedAt: new Date() } }
        );
      } else {
        await db.collection('users').updateOne(
          { minecraftUuid: uuid },
          { $set: { banned: false }, $unset: { banReason: '', bannedAt: '' } }
        );
      }

      res.json({ success: true });
    } catch (error) {
      console.error('[ADMIN BAN] Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Error handler
  app.use((err, req, res, next) => {
    console.error('❌ Error:', err);
    res.status(500).json({ error: { message: err.message || 'Internal Server Error' } });
  });

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({ error: { message: 'Endpoint not found', path: req.path } });
  });

  return app;
}

async function startServer() {
  try {
    console.log('🚀 Iniciando servidor...');
    await connectToDatabase();
    const app = createApp();

    app.listen(PORT, '0.0.0.0', async () => {
      console.log(`✅ Servidor en puerto ${PORT}`);
      console.log(`\n📋 Endpoints del plugin:`);
      console.log(`   POST /api/players/sync`);
      console.log(`   GET  /api/admin/ban-status`);
      console.log(`   POST /api/verification/generate-web (NEW)`);
      console.log(`   POST /api/verification/link (NEW)`);
      console.log(`   GET  /api/verification/status (NEW)`);
      console.log(`   POST /api/verification/generate (legacy)`);
      console.log(`   POST /api/verification/verify (legacy)`);
      console.log(`   GET  /api/gacha/delivery/status`);
      console.log(`   POST /api/gacha/delivery/start`);
      console.log(`   POST /api/gacha/delivery/success`);
      console.log(`   POST /api/gacha/delivery/failed`);
      console.log(`   GET  /api/level-caps/version`);
      console.log(`   GET  /api/level-caps/effective`);
      console.log(`   GET  /api/shop/purchases`);
      console.log(`   POST /api/shop/claim`);
      console.log(`   POST /api/shop/purchase\n`);

      // Sistema de precios dinámicos - se ejecuta cada hora
      // Verifica si ya pasó 1 hora desde la última actualización
      const checkAndUpdatePrices = async () => {
        try {
          const database = getDb();
          const lastUpdate = await database.collection('price_history').findOne(
            {}, 
            { sort: { timestamp: -1 } }
          );
          
          const oneHourAgo = new Date(Date.now() - 3600000);
          
          if (!lastUpdate || new Date(lastUpdate.timestamp) < oneHourAgo) {
            console.log('🤖 [PRICE AI] Running price analysis...');
            await updateDynamicPrices();
          } else {
            const nextUpdate = new Date(new Date(lastUpdate.timestamp).getTime() + 3600000);
            console.log(`🤖 [PRICE AI] Next update at ${nextUpdate.toLocaleTimeString()}`);
          }
        } catch (error) {
          console.error('[PRICE AI] Error checking prices:', error);
        }
      };

      // Verificar al iniciar
      await checkAndUpdatePrices();

      // Verificar cada 5 minutos si ya pasó 1 hora
      setInterval(checkAndUpdatePrices, 300000); // 5 minutos
      
      console.log('⏰ [PRICE AI] Price system active (updates hourly)');
    });

    process.on('SIGTERM', () => process.exit(0));
    process.on('SIGINT', () => process.exit(0));
  } catch (error) {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  }
}

startServer();
module.exports = { createApp, connectToDatabase };
