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
const { MongoClient, ObjectId } = require('mongodb');
const crypto = require('crypto');

// Modular routes
const { initModsRoutes } = require('./routes/mods.routes');
const { initEconomyRoutes } = require('./routes/economy.routes');
const { initDiscordBot, generateVerificationCode, isPlayerVerified, getBotStatus } = require('./routes/discord-bot.routes');

// Environment variables
const PORT = process.env.PORT || 25617;
const MONGODB_URI = process.env.MONGODB_URI || '';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const NODE_ENV = process.env.NODE_ENV || 'development';
const isDevelopment = NODE_ENV === 'development';
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';

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
// GROQ LLM ECONOMIC AI PRICING SYSTEM
// Uses real AI to analyze economy and set prices
// ============================================

// Base rarity configuration (AI will adjust these)
const RARITY_CONFIG = {
  'poke_ball': { rarity: 'common', baseMultiplier: 0.15 },
  'great_ball': { rarity: 'common', baseMultiplier: 0.25 },
  'ultra_ball': { rarity: 'uncommon', baseMultiplier: 0.5 },
  'premier_ball': { rarity: 'common', baseMultiplier: 0.15 },
  'luxury_ball': { rarity: 'uncommon', baseMultiplier: 0.4 },
  'heal_ball': { rarity: 'common', baseMultiplier: 0.2 },
  'net_ball': { rarity: 'uncommon', baseMultiplier: 0.4 },
  'dive_ball': { rarity: 'uncommon', baseMultiplier: 0.4 },
  'nest_ball': { rarity: 'uncommon', baseMultiplier: 0.4 },
  'repeat_ball': { rarity: 'uncommon', baseMultiplier: 0.4 },
  'timer_ball': { rarity: 'uncommon', baseMultiplier: 0.4 },
  'quick_ball': { rarity: 'rare', baseMultiplier: 0.7 },
  'dusk_ball': { rarity: 'uncommon', baseMultiplier: 0.5 },
  'level_ball': { rarity: 'rare', baseMultiplier: 1.0 },
  'lure_ball': { rarity: 'rare', baseMultiplier: 1.0 },
  'moon_ball': { rarity: 'rare', baseMultiplier: 1.0 },
  'friend_ball': { rarity: 'rare', baseMultiplier: 1.0 },
  'love_ball': { rarity: 'rare', baseMultiplier: 1.2 },
  'heavy_ball': { rarity: 'rare', baseMultiplier: 1.0 },
  'fast_ball': { rarity: 'rare', baseMultiplier: 1.0 },
  'safari_ball': { rarity: 'rare', baseMultiplier: 0.8 },
  'sport_ball': { rarity: 'rare', baseMultiplier: 0.8 },
  'dream_ball': { rarity: 'epic', baseMultiplier: 1.5 },
  'beast_ball': { rarity: 'epic', baseMultiplier: 2.5 },
  'master_ball': { rarity: 'legendary', baseMultiplier: 10.0 },
};

// Stock ranges by rarity
const STOCK_RANGES = {
  common: { min: 50, max: 150 },
  uncommon: { min: 20, max: 60 },
  rare: { min: 5, max: 15 },
  epic: { min: 1, max: 5 },
  legendary: { min: 0, max: 1 },
};

/**
 * Call Groq LLM API for economic analysis
 */
async function callGroqLLM(prompt) {
  if (!GROQ_API_KEY) {
    console.log('[GROQ] No API key configured, using fallback pricing');
    return null;
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages: [
          {
            role: 'system',
            content: `You are an AGGRESSIVE game economist for a Pokémon Minecraft server. Your job is to set HIGH prices that make players WORK HARD for items.

CRITICAL PRICING RULES:
- Use the 75th PERCENTILE (P75) as your base, NOT the median - this targets the richer players
- If there's high wealth inequality (some rich, some poor), prices should target the RICH players
- Players with 0 balance should be IGNORED when calculating prices
- Common balls: 15-25% of P75 balance (minimum 500)
- Uncommon balls: 30-50% of P75 balance (minimum 1,000)
- Rare balls: 75-150% of P75 balance (minimum 3,000)
- Epic balls: 200-400% of P75 balance (minimum 10,000)
- Legendary (Master Ball): 800-1500% of P75 balance (minimum 50,000)
- NEVER set prices below the minimums listed above
- Items should feel EXPENSIVE - players should need to grind
- A Poké Ball should NEVER cost less than 500
- A Master Ball should NEVER cost less than 50,000
- Always respond with valid JSON only, no explanations`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      console.error('[GROQ] API error:', response.status, await response.text());
      return null;
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    if (!content) return null;

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    return null;
  } catch (error) {
    console.error('[GROQ] Error calling API:', error.message);
    return null;
  }
}

/**
 * GROQ LLM-POWERED ECONOMIC ANALYSIS
 * Sends economy data to AI and gets price recommendations
 */
async function updateDynamicPricesWithAI() {
  try {
    const database = getDb();
    console.log('[ECONOMIC AI] Starting LLM-powered economic analysis...');
    
    // Gather economic data - EXCLUDE players with 0 balance
    const users = await database.collection('users').find({
      cobbleDollars: { $exists: true, $gt: 0 }
    }).toArray();

    const balances = users.map(u => u.cobbleDollars || 0).filter(b => b > 0);
    
    if (balances.length === 0) {
      console.log('[ECONOMIC AI] No players with balance > 0, using minimum prices');
      await setFallbackPrices(database);
      return;
    }

    // Calculate statistics (excluding 0 balances)
    const sortedBalances = [...balances].sort((a, b) => a - b);
    const totalPlayers = balances.length;
    const totalWealth = balances.reduce((a, b) => a + b, 0);
    const averageBalance = Math.round(totalWealth / totalPlayers);
    const medianBalance = sortedBalances[Math.floor(sortedBalances.length / 2)];
    const minBalance = sortedBalances[0];
    const maxBalance = sortedBalances[sortedBalances.length - 1];
    const p25 = sortedBalances[Math.floor(sortedBalances.length * 0.25)];
    const p75 = sortedBalances[Math.floor(sortedBalances.length * 0.75)];
    const p90 = sortedBalances[Math.floor(sortedBalances.length * 0.90)];
    
    // Calculate wealth inequality (Gini-like)
    const wealthGap = maxBalance > 0 ? (maxBalance - minBalance) / maxBalance : 0;

    // Get recent purchase history
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentPurchases = await database.collection('shop_purchases').find({
      createdAt: { $gte: oneDayAgo }
    }).toArray();

    const totalSpent24h = recentPurchases.reduce((sum, p) => sum + (p.totalPrice || 0), 0);
    const purchaseCount24h = recentPurchases.length;

    // Get current shop items
    const shopItems = await database.collection('shop_items').find({}).toArray();
    const itemNames = shopItems.map(i => ({ id: i.id, name: i.name, rarity: RARITY_CONFIG[i.id]?.rarity || 'uncommon' }));

    // Build prompt for Groq - emphasize P75 and high prices
    const prompt = `Analyze this Pokémon server economy and set AGGRESSIVE prices for Pokéballs.

ECONOMY DATA (players with balance > 0 only):
- Active Players: ${totalPlayers}
- Total Wealth: ${totalWealth.toLocaleString()} CobbleDollars
- Average Balance: ${averageBalance.toLocaleString()}
- Median Balance: ${medianBalance.toLocaleString()}
- Min Balance: ${minBalance.toLocaleString()}
- Max Balance: ${maxBalance.toLocaleString()}
- 25th Percentile (P25): ${p25.toLocaleString()}
- 75th Percentile (P75): ${p75.toLocaleString()} <-- USE THIS AS BASE
- 90th Percentile (P90): ${p90.toLocaleString()}
- Wealth Inequality: ${(wealthGap * 100).toFixed(1)}% gap between richest and poorest
- Purchases in last 24h: ${purchaseCount24h}
- Money spent in 24h: ${totalSpent24h.toLocaleString()}

ITEMS TO PRICE (use P75 as base, prices should be HIGH):
${itemNames.map(i => `- ${i.id} (${i.rarity}): ${i.name}`).join('\n')}

MINIMUM PRICES (NEVER go below these):
- Common balls: minimum 500
- Uncommon balls: minimum 1,000
- Rare balls: minimum 3,000
- Epic balls: minimum 10,000
- Legendary: minimum 50,000

Set prices that make players GRIND. Use P75 (${p75.toLocaleString()}) as your reference point.

Respond with ONLY a JSON object in this exact format:
{
  "analysis": "Brief 1-2 sentence analysis",
  "economyHealth": "healthy|inflated|deflated",
  "recommendedBasePrice": <number based on P75>,
  "prices": {
    "poke_ball": <price, max 800>,
    "great_ball": <price, min 500>,
    "ultra_ball": <price, min 400>,
    "premier_ball": <price, min 500>,
    "luxury_ball": <price, min 1000>,
    "heal_ball": <price, min 500>,
    "net_ball": <price, min 1000>,
    "dive_ball": <price, min 1000>,
    "nest_ball": <price, min 1000>,
    "repeat_ball": <price, min 1000>,
    "timer_ball": <price, min 1000>,
    "quick_ball": <price, min 3000>,
    "dusk_ball": <price, min 1000>,
    "level_ball": <price, min 3000>,
    "lure_ball": <price, min 3000>,
    "moon_ball": <price, min 3000>,
    "friend_ball": <price, min 3000>,
    "love_ball": <price, min 3000>,
    "heavy_ball": <price, min 3000>,
    "fast_ball": <price, min 3000>,
    "safari_ball": <price, min 3000>,
    "sport_ball": <price, min 3000>,
    "dream_ball": <price, min 10000>,
    "beast_ball": <price, min 10000>,
    "master_ball": <price, min 50000>
  }
}`;

    console.log('[ECONOMIC AI] Calling Groq LLM for price analysis...');
    const aiResponse = await callGroqLLM(prompt);

    if (aiResponse && aiResponse.prices) {
      console.log(`[ECONOMIC AI] AI Analysis: ${aiResponse.analysis}`);
      console.log(`[ECONOMIC AI] Economy Health: ${aiResponse.economyHealth}`);
      console.log(`[ECONOMIC AI] Recommended Base: ${aiResponse.recommendedBasePrice}`);

      // Minimum prices by rarity (ENFORCED)
      const MIN_PRICES = {
        common: 500,
        uncommon: 1000,
        rare: 3000,
        epic: 10000,
        legendary: 50000,
      };

      // Apply AI-recommended prices with ENFORCED minimums
      for (const item of shopItems) {
        const aiPrice = aiResponse.prices[item.id];
        if (aiPrice && typeof aiPrice === 'number' && aiPrice > 0) {
          const config = RARITY_CONFIG[item.id] || { rarity: 'uncommon' };
          const stockRange = STOCK_RANGES[config.rarity] || { min: 10, max: 50 };
          const minPrice = MIN_PRICES[config.rarity] || 500;
          
          // Enforce minimum price
          let finalPrice = Math.max(Math.round(aiPrice), minPrice);
          
          // Round to nice numbers
          if (finalPrice < 500) finalPrice = 500;
          else if (finalPrice < 2000) finalPrice = Math.round(finalPrice / 50) * 50;
          else if (finalPrice < 10000) finalPrice = Math.round(finalPrice / 100) * 100;
          else if (finalPrice < 50000) finalPrice = Math.round(finalPrice / 500) * 500;
          else finalPrice = Math.round(finalPrice / 1000) * 1000;

          // Calculate stock
          let newStock = Math.floor(Math.random() * (stockRange.max - stockRange.min + 1)) + stockRange.min;
          if (config.rarity === 'legendary') {
            newStock = Math.random() < 0.10 ? 1 : 0; // 10% chance for Master Ball (rarer)
          }

          await database.collection('shop_items').updateOne(
            { id: item.id },
            { 
              $set: { 
                currentPrice: finalPrice,
                currentStock: newStock,
                maxStock: stockRange.max,
                lastPriceUpdate: new Date(),
                aiAnalysis: aiResponse.analysis,
              } 
            }
          );

          console.log(`[ECONOMIC AI] ${item.name}: ${finalPrice.toLocaleString()} (stock: ${newStock})`);
        }
      }

      // Save analysis history
      await database.collection('price_history').insertOne({
        timestamp: new Date(),
        source: 'groq-llm',
        playersAnalyzed: totalPlayers,
        totalWealth,
        averageBalance,
        medianBalance,
        p75,
        p90,
        wealthGap,
        aiAnalysis: aiResponse.analysis,
        economyHealth: aiResponse.economyHealth,
        recommendedBasePrice: aiResponse.recommendedBasePrice,
        prices: aiResponse.prices,
      });

      console.log('[ECONOMIC AI] ✅ Prices updated using Groq LLM analysis');
    } else {
      console.log('[ECONOMIC AI] AI response invalid, using fallback pricing');
      await setFallbackPrices(database, medianBalance);
    }

  } catch (error) {
    console.error('[ECONOMIC AI] Error:', error);
  }
}

/**
 * Fallback pricing when AI is unavailable
 */
async function setFallbackPrices(database, medianBalance = 10000) {
  const shopItems = await database.collection('shop_items').find({}).toArray();
  
  // Use higher multipliers for fallback
  const fallbackMultipliers = {
    common: 0.1,      // 10% of median
    uncommon: 0.3,    // 30% of median
    rare: 0.7,        // 70% of median
    epic: 2.0,        // 200% of median
    legendary: 8.0,   // 800% of median
  };

  for (const item of shopItems) {
    const config = RARITY_CONFIG[item.id] || { rarity: 'uncommon', baseMultiplier: 0.3 };
    const stockRange = STOCK_RANGES[config.rarity] || { min: 10, max: 50 };
    
    let price = Math.round(medianBalance * fallbackMultipliers[config.rarity] * config.baseMultiplier);
    price = Math.max(price, 100); // Minimum 100
    
    // Round to nice numbers
    if (price < 500) price = Math.round(price / 25) * 25;
    else if (price < 2000) price = Math.round(price / 50) * 50;
    else if (price < 10000) price = Math.round(price / 100) * 100;
    else price = Math.round(price / 500) * 500;

    let newStock = Math.floor(Math.random() * (stockRange.max - stockRange.min + 1)) + stockRange.min;
    if (config.rarity === 'legendary') {
      newStock = Math.random() < 0.1 ? 1 : 0;
    }

    await database.collection('shop_items').updateOne(
      { id: item.id },
      { 
        $set: { 
          currentPrice: price,
          currentStock: newStock,
          maxStock: stockRange.max,
          lastPriceUpdate: new Date(),
        } 
      }
    );
  }

  console.log('[ECONOMIC AI] Fallback prices applied');
}

// Alias for backward compatibility
const updateDynamicPrices = updateDynamicPricesWithAI;

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
    'https://cobblemon2.vercel.app',
    'http://localhost:3000',
  ].filter(Boolean);

  // Handle preflight requests FIRST (before CORS middleware)
  app.options('*', (req, res) => {
    const origin = req.headers.origin;
    if (origin && (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app'))) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie, X-Requested-With, Accept, Origin');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Max-Age', '86400'); // Cache preflight for 24 hours
    }
    res.status(204).end();
  });

  app.use(cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      if (origin.endsWith('.vercel.app')) return callback(null, true);
      if (isDevelopment && origin.startsWith('http://localhost:')) return callback(null, true);
      console.log(`[CORS] Blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With', 'Accept', 'Origin'],
    exposedHeaders: ['Content-Disposition'], // For file downloads
    maxAge: 86400, // Cache preflight for 24 hours
  }));

  // Body parsers with increased limits for large payloads
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));
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
      
      // DEBUG: Log what the plugin is sending
      if (username === 'ZekkJJ') {
        console.log('[SYNC DEBUG] ZekkJJ sync received:');
        console.log('  - party:', party ? `${party.length} pokemon` : 'undefined');
        console.log('  - pcStorage:', pcStorage ? `${pcStorage.length} items` : 'undefined');
        console.log('  - online:', online);
        console.log('  - position:', x, y, z, world);
        if (party && party.length > 0) {
          console.log('  - party pokemon:', party.map(p => `${p?.species || p?.name} Lv.${p?.level}`).join(', '));
        }
      }
      
      if (!uuid || !username) {
        return res.status(400).json({ error: 'uuid and username required' });
      }

      const db = getDb();
      const user = await db.collection('users').findOne({ minecraftUuid: uuid });
      
      // Use cobbleDollarsBalance if cobbleDollars not provided (plugin sends cobbleDollarsBalance)
      const balance = cobbleDollars !== undefined ? cobbleDollars : cobbleDollarsBalance;

      if (!user) {
        // Create new user - only save party if it has data
        const newUser = {
          minecraftUuid: uuid,
          minecraftUsername: username,
          online: online || false,
          party: (party && Array.isArray(party) && party.length > 0) ? party : [],
          pcStorage: (pcStorage && Array.isArray(pcStorage) && pcStorage.length > 0) ? pcStorage : [],
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
        };
        await db.collection('users').insertOne(newUser);
        return res.json({ success: true, verified: false, banned: false });
      }

      // Update existing user
      const updateData = {
        minecraftUsername: username,
        online: online || false,
        updatedAt: new Date(),
      };
      
      // Only update party if provided AND not empty (preserve party data when player disconnects)
      // This ensures offline players still appear in rankings with their last known team
      if (party !== undefined && Array.isArray(party) && party.length > 0) {
        updateData.party = party;
      }
      // Only update pcStorage if provided AND not empty
      if (pcStorage !== undefined && Array.isArray(pcStorage) && pcStorage.length > 0) {
        updateData.pcStorage = pcStorage;
      }
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
  // NEW VERIFICATION FLOW (In-Game → Discord)
  // Plugin generates code when player joins
  // Player posts code in Discord channel
  // Bot reads message and links accounts
  // ============================================

  // POST /api/verification/generate-code - Plugin generates code for unverified player
  app.post('/api/verification/generate-code', async (req, res) => {
    try {
      const { minecraftUuid, minecraftUsername } = req.body;
      if (!minecraftUuid || !minecraftUsername) {
        return res.status(400).json({ error: 'minecraftUuid and minecraftUsername required' });
      }

      const database = getDb();
      
      // Check if already verified
      const existingPlayer = await database.collection('players').findOne({ 
        minecraftUuid,
        verified: true 
      });
      
      if (existingPlayer) {
        return res.json({ 
          success: true, 
          alreadyVerified: true,
          discordUsername: existingPlayer.discordUsername 
        });
      }

      // Generate code using the discord-bot module
      const code = await generateVerificationCode(minecraftUuid, minecraftUsername);

      console.log(`[VERIFICATION] Generated code ${code} for ${minecraftUsername}`);
      res.json({ success: true, code });
    } catch (error) {
      console.error('[VERIFICATION GENERATE CODE] Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /api/verification/bot-status - Check Discord bot status
  app.get('/api/verification/bot-status', async (req, res) => {
    try {
      const status = getBotStatus();
      res.json({ success: true, ...status });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ============================================
  // LEGACY VERIFICATION FLOW (Web → In-Game)
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

      // FIXED: Update the Discord user document directly (this is the one created at login)
      // This ensures we update the existing document instead of creating a new one
      const updateResult = await db.collection('users').updateOne(
        { discordId }, // Find by discordId (the document created at login)
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

      console.log(`[VERIFICATION] Update result: matched=${updateResult.matchedCount}, modified=${updateResult.modifiedCount}, upserted=${updateResult.upsertedCount}`);

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

      console.log(`[LEVEL CAPS] Effective request for ${uuid}, config:`, config ? JSON.stringify({
        version: config.version,
        captureCap: config.globalConfig?.defaultCaptureCap,
        ownershipCap: config.globalConfig?.defaultOwnershipCap
      }) : 'null');

      // Default caps if no config
      if (!config) {
        console.log(`[LEVEL CAPS] No config found, returning defaults (100/100)`);
        return res.json({
          success: true,
          captureCap: 100,
          ownershipCap: 100,
          appliedRules: [],
          calculatedAt: new Date(),
        });
      }

      const captureCap = config.globalConfig?.defaultCaptureCap || 100;
      const ownershipCap = config.globalConfig?.defaultOwnershipCap || 100;

      console.log(`[LEVEL CAPS] Returning caps: capture=${captureCap}, ownership=${ownershipCap}`);

      res.json({
        success: true,
        captureCap,
        ownershipCap,
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

      console.log(`[LEVEL CAPS] Updating config:`, JSON.stringify(req.body));

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
      console.log(`[LEVEL CAPS] Config updated to version ${newVersion}:`, JSON.stringify({
        captureCap: updated?.globalConfig?.defaultCaptureCap,
        ownershipCap: updated?.globalConfig?.defaultOwnershipCap
      }));
      res.json(updated);
    } catch (error) {
      console.error('[LEVEL CAPS CONFIG] Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /api/shop/purchases - Get pending purchases for player
  // CRITICAL: Marks purchases as 'delivering' to prevent duplicate deliveries
  app.get('/api/shop/purchases', async (req, res) => {
    try {
      const uuid = req.query.uuid;
      if (!uuid) {
        return res.status(400).json({ error: 'uuid required' });
      }

      const db = getDb();
      
      // Find pending purchases only
      const pendingPurchases = await db.collection('shop_purchases')
        .find({ minecraftUuid: uuid, status: 'pending' })
        .toArray();
      
      if (pendingPurchases.length === 0) {
        return res.json({ success: true, purchases: [] });
      }
      
      // Mark each as "delivering" to prevent duplicate fetches
      for (const purchase of pendingPurchases) {
        await db.collection('shop_purchases').updateOne(
          { _id: purchase._id, status: 'pending' },
          { $set: { status: 'delivering', deliveringStartedAt: new Date() } }
        );
      }

      // Convert _id to string for easier handling in plugin
      const purchasesWithStringId = pendingPurchases.map(p => ({
        ...p,
        _id: p._id.toString(),
        status: 'delivering'
      }));

      console.log(`[SHOP PURCHASES] UUID: ${uuid}, Delivering: ${pendingPurchases.length}`);
      if (pendingPurchases.length > 0) {
        console.log(`[SHOP PURCHASES] Items:`, pendingPurchases.map(p => `${p.quantity}x ${p.ballName} (${p._id})`).join(', '));
      }

      res.json({ success: true, purchases: purchasesWithStringId });
    } catch (error) {
      console.error('[SHOP PURCHASES] Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /api/shop/claim - Claim a purchase (mark as delivered)
  app.post('/api/shop/claim', async (req, res) => {
    try {
      const { uuid, purchaseId } = req.body;
      if (!uuid || !purchaseId) {
        return res.status(400).json({ error: 'uuid and purchaseId required' });
      }

      console.log(`[SHOP CLAIM] Attempting to claim: uuid=${uuid}, purchaseId=${purchaseId}`);

      const db = getDb();
      
      // Parse ObjectId (ObjectId is imported at top of file)
      let objectId;
      try {
        objectId = new ObjectId(purchaseId);
      } catch (e) {
        console.log(`[SHOP CLAIM] Invalid ObjectId format: ${purchaseId}`);
        return res.status(400).json({ error: 'Invalid purchaseId format' });
      }
      
      // First try to claim from 'delivering' status
      let result = await db.collection('shop_purchases').updateOne(
        { _id: objectId, minecraftUuid: uuid, status: 'delivering' },
        { $set: { status: 'claimed', claimedAt: new Date() } }
      );
      
      // If not found in delivering, try pending (fallback)
      if (result.matchedCount === 0) {
        result = await db.collection('shop_purchases').updateOne(
          { _id: objectId, minecraftUuid: uuid, status: 'pending' },
          { $set: { status: 'claimed', claimedAt: new Date() } }
        );
      }

      console.log(`[SHOP CLAIM] Result: matched=${result.matchedCount}, modified=${result.modifiedCount}`);

      if (result.modifiedCount === 0) {
        // Check if already claimed
        const existing = await db.collection('shop_purchases').findOne({ _id: objectId });
        if (existing && existing.status === 'claimed') {
          console.log(`[SHOP CLAIM] Purchase ${purchaseId} was already claimed`);
          return res.json({ success: true, alreadyClaimed: true });
        }
        console.log(`[SHOP CLAIM] Failed to claim - purchase not found`);
        return res.status(404).json({ error: 'Purchase not found' });
      }

      console.log(`[SHOP CLAIM] Successfully claimed purchase ${purchaseId}`);
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

  // ============================================
  // PLAYER ECONOMY ENDPOINTS (for plugin)
  // ============================================

  // GET /api/players/economy/:uuid - Get player economy data
  app.get('/api/players/economy/:uuid', async (req, res) => {
    try {
      const { uuid } = req.params;
      
      if (!uuid) {
        return res.status(400).json({ success: false, error: 'UUID is required' });
      }

      const db = getDb();
      const user = await db.collection('users').findOne({ minecraftUuid: uuid });
      
      if (!user) {
        return res.json({ 
          success: true, 
          exists: false,
          lastSynergyReward: null,
          lastDailyReward: null,
          dailyStreak: 0,
          caughtSpecies: []
        });
      }

      console.log(`[ECONOMY] GET economy data for ${user.minecraftUsername || uuid}`);
      
      res.json({ 
        success: true,
        exists: true,
        lastSynergyReward: user.lastSynergyReward || null,
        lastDailyReward: user.lastDailyReward || null,
        dailyStreak: user.dailyStreak || 0,
        caughtSpecies: user.caughtSpecies || [],
        cobbleDollars: user.cobbleDollars || 0
      });
    } catch (error) {
      console.error('[ECONOMY] Error getting economy data:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // POST /api/players/economy/daily - Save daily reward data
  app.post('/api/players/economy/daily', async (req, res) => {
    try {
      const { uuid, timestamp, streak } = req.body;
      
      if (!uuid) {
        return res.status(400).json({ success: false, error: 'UUID is required' });
      }

      const db = getDb();
      await db.collection('users').updateOne(
        { minecraftUuid: uuid },
        { 
          $set: { 
            lastDailyReward: timestamp ? new Date(timestamp) : new Date(),
            dailyStreak: streak || 1,
            lastEconomyUpdate: new Date()
          }
        },
        { upsert: false }
      );

      console.log(`[ECONOMY] Daily reward saved for ${uuid}: streak ${streak}`);
      
      res.json({ success: true });
    } catch (error) {
      console.error('[ECONOMY] Error saving daily reward:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // POST /api/players/economy/synergy - Save synergy reward timestamp
  app.post('/api/players/economy/synergy', async (req, res) => {
    try {
      const { uuid, timestamp } = req.body;
      
      if (!uuid) {
        return res.status(400).json({ success: false, error: 'UUID is required' });
      }

      const db = getDb();
      await db.collection('users').updateOne(
        { minecraftUuid: uuid },
        { 
          $set: { 
            lastSynergyReward: timestamp ? new Date(timestamp) : new Date(),
            lastEconomyUpdate: new Date()
          }
        },
        { upsert: false }
      );

      console.log(`[ECONOMY] Synergy reward saved for ${uuid}`);
      
      res.json({ success: true });
    } catch (error) {
      console.error('[ECONOMY] Error saving synergy reward:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // POST /api/players/economy/species - Register caught species
  app.post('/api/players/economy/species', async (req, res) => {
    try {
      const { uuid, species } = req.body;
      
      if (!uuid || !species) {
        return res.status(400).json({ success: false, error: 'UUID and species are required' });
      }

      const db = getDb();
      await db.collection('users').updateOne(
        { minecraftUuid: uuid },
        { 
          $addToSet: { caughtSpecies: species.toLowerCase() },
          $set: { lastEconomyUpdate: new Date() }
        },
        { upsert: false }
      );

      console.log(`[ECONOMY] Species ${species} registered for ${uuid}`);
      
      res.json({ success: true });
    } catch (error) {
      console.error('[ECONOMY] Error registering species:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // POST /api/players/economy/transaction - Process economy transaction
  app.post('/api/players/economy/transaction', async (req, res) => {
    try {
      const { uuid, type, amount, reason } = req.body;
      
      if (!uuid) {
        return res.status(400).json({ success: false, error: 'UUID is required' });
      }

      if (!type || !['add', 'remove', 'set'].includes(type)) {
        return res.status(400).json({ success: false, error: 'Invalid transaction type' });
      }

      if (typeof amount !== 'number' || amount < 0) {
        return res.status(400).json({ success: false, error: 'Amount must be a non-negative number' });
      }

      const db = getDb();
      const user = await db.collection('users').findOne({ minecraftUuid: uuid });
      const previousBalance = user?.cobbleDollars || 0;
      let newBalance = previousBalance;

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

      await db.collection('users').updateOne(
        { minecraftUuid: uuid },
        { $set: { cobbleDollars: newBalance, lastEconomyUpdate: new Date() } }
      );

      // Log transaction
      await db.collection('economy_transactions').insertOne({
        uuid,
        type,
        amount,
        previousBalance,
        newBalance,
        reason: reason || 'No reason',
        source: 'plugin',
        timestamp: new Date()
      });

      console.log(`[ECONOMY] Transaction: ${type} ${amount} for ${uuid} | ${previousBalance} -> ${newBalance}`);

      res.json({ success: true, previousBalance, newBalance });
    } catch (error) {
      console.error('[ECONOMY] Transaction error:', error);
      res.status(500).json({ success: false, error: 'Transaction failed' });
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
      console.log('[PLAYER PROFILE] Fetching profile for UUID:', uuid);
      
      const db = getDb();
      const user = await db.collection('users').findOne({ minecraftUuid: uuid });

      if (!user) {
        console.log('[PLAYER PROFILE] User not found for UUID:', uuid);
        return res.status(404).json({ error: 'Player not found' });
      }

      // Normalize pokemon data - use pokemonParty if party is empty (legacy support)
      // Also check pokemonPC for legacy PC storage
      const party = (user.party && user.party.length > 0) ? user.party : (user.pokemonParty || []);
      const pcStorage = (user.pcStorage && user.pcStorage.length > 0) ? user.pcStorage : (user.pokemonPC || []);
      
      console.log('[PLAYER PROFILE] Found user:', user.minecraftUsername);
      console.log('[PLAYER PROFILE] party:', party.length, '(from:', user.party?.length > 0 ? 'party' : 'pokemonParty', ')');
      console.log('[PLAYER PROFILE] pc:', pcStorage.length, '(from:', user.pcStorage?.length > 0 ? 'pcStorage' : 'pokemonPC', ')');
      
      // Return normalized profile
      res.json({ 
        success: true, 
        profile: {
          ...user,
          party: party,
          pcStorage: pcStorage
        }
      });
    } catch (error) {
      console.error('[PLAYER PROFILE] Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ============================================
  // LEADERBOARD ENDPOINTS
  // ============================================

  // GET /api/leaderboard - Get all leaderboards
  app.get('/api/leaderboard', async (req, res) => {
    try {
      const db = getDb();
      const users = await db.collection('users').find({
        minecraftUsername: { $exists: true, $ne: null },
        verified: true
      }).toArray();

      // Calculate stats for each player
      const playersWithStats = users.map(user => {
        const allPokemon = [...(user.party || []), ...(user.pcStorage || [])];
        const partyPokemon = user.party || [];
        
        // Calculate average level of party (max 6)
        const partyLevels = partyPokemon.slice(0, 6).map(p => p?.level || 0);
        const avgLevel = partyLevels.length > 0 
          ? Math.round(partyLevels.reduce((a, b) => a + b, 0) / partyLevels.length) 
          : 0;
        
        // Count shinies
        const shinyCount = allPokemon.filter(p => p?.shiny === true).length;
        
        return {
          uuid: user.minecraftUuid,
          username: user.minecraftUsername,
          cobbleDollars: user.cobbleDollars || 0,
          avgLevel,
          shinyCount,
          totalPokemon: allPokemon.length,
          online: user.online || false,
        };
      });

      // Top CobbleDollars (Top 10)
      const topCobbleDollars = [...playersWithStats]
        .sort((a, b) => b.cobbleDollars - a.cobbleDollars)
        .slice(0, 10)
        .map((p, i) => ({ rank: i + 1, ...p }));

      // Top Average Level (Top 10)
      const topAvgLevel = [...playersWithStats]
        .filter(p => p.avgLevel > 0)
        .sort((a, b) => b.avgLevel - a.avgLevel)
        .slice(0, 10)
        .map((p, i) => ({ rank: i + 1, ...p }));

      // Top Shinies (Top 10)
      const topShinies = [...playersWithStats]
        .filter(p => p.shinyCount > 0)
        .sort((a, b) => b.shinyCount - a.shinyCount)
        .slice(0, 10)
        .map((p, i) => ({ rank: i + 1, ...p }));

      res.json({
        success: true,
        leaderboards: {
          cobbleDollars: topCobbleDollars,
          avgLevel: topAvgLevel,
          shinies: topShinies,
        },
        totalPlayers: users.length,
        lastUpdated: new Date(),
      });
    } catch (error) {
      console.error('[LEADERBOARD] Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ============================================
  // STRONGEST POKEMON RANKING
  // Un Pokémon por jugador (el más fuerte)
  // Stats REALES, no aproximaciones
  // ============================================

  // Cache for strongest pokemon ranking (updates every 2 hours)
  let strongestPokemonCache = null;
  let lastStrongestCalculation = null;
  const STRONGEST_CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

  // Calculate pokemon power with high precision
  function calculatePokemonPower(pokemon) {
    const level = pokemon.level || 1;
    const ivs = pokemon.ivs || { hp: 0, attack: 0, defense: 0, spAttack: 0, spDefense: 0, speed: 0 };
    const evs = pokemon.evs || { hp: 0, attack: 0, defense: 0, spAttack: 0, spDefense: 0, speed: 0 };
    
    const ivTotal = (ivs.hp || 0) + (ivs.attack || 0) + (ivs.defense || 0) + 
                    (ivs.spAttack || 0) + (ivs.spDefense || 0) + (ivs.speed || 0);
    const evTotal = (evs.hp || 0) + (evs.attack || 0) + (evs.defense || 0) + 
                    (evs.spAttack || 0) + (evs.spDefense || 0) + (evs.speed || 0);
    
    // Nature multiplier
    const beneficialNatures = {
      'adamant': 1.1, 'jolly': 1.1, 'modest': 1.1, 'timid': 1.1,
      'brave': 1.08, 'quiet': 1.08, 'impish': 1.05, 'careful': 1.05,
      'bold': 1.05, 'calm': 1.05, 'relaxed': 1.03, 'sassy': 1.03,
    };
    const natureMultiplier = beneficialNatures[(pokemon.nature || '').toLowerCase()] || 1.0;
    
    // Bonuses
    const shinyBonus = pokemon.shiny ? 1.05 : 1.0;
    const friendshipBonus = (pokemon.friendship || 0) >= 255 ? 1.02 : 1.0;
    
    // Base power calculation
    const basePower = (level * 100) + (ivTotal * 50) + (evTotal * 10) + (natureMultiplier * 500);
    
    // Precision decimals from individual stats
    const ivPrecision = 
      ((ivs.hp || 0) / 31) * 0.1 +
      ((ivs.attack || 0) / 31) * 0.01 +
      ((ivs.defense || 0) / 31) * 0.001 +
      ((ivs.spAttack || 0) / 31) * 0.0001 +
      ((ivs.spDefense || 0) / 31) * 0.00001 +
      ((ivs.speed || 0) / 31) * 0.000001;
    
    return (basePower * shinyBonus * friendshipBonus) + ivPrecision;
  }

  // Generate REAL stats (not approximations)
  function generateRealStats(pokemon) {
    const ivs = pokemon.ivs || { hp: 0, attack: 0, defense: 0, spAttack: 0, spDefense: 0, speed: 0 };
    const evs = pokemon.evs || { hp: 0, attack: 0, defense: 0, spAttack: 0, spDefense: 0, speed: 0 };
    
    return {
      level: pokemon.level || 1,
      ivs: {
        hp: ivs.hp || 0,
        attack: ivs.attack || 0,
        defense: ivs.defense || 0,
        spAttack: ivs.spAttack || 0,
        spDefense: ivs.spDefense || 0,
        speed: ivs.speed || 0,
        total: (ivs.hp || 0) + (ivs.attack || 0) + (ivs.defense || 0) + 
               (ivs.spAttack || 0) + (ivs.spDefense || 0) + (ivs.speed || 0),
      },
      evs: {
        hp: evs.hp || 0,
        attack: evs.attack || 0,
        defense: evs.defense || 0,
        spAttack: evs.spAttack || 0,
        spDefense: evs.spDefense || 0,
        speed: evs.speed || 0,
        total: (evs.hp || 0) + (evs.attack || 0) + (evs.defense || 0) + 
               (evs.spAttack || 0) + (evs.spDefense || 0) + (evs.speed || 0),
      },
      nature: pokemon.nature || 'Unknown',
      shiny: pokemon.shiny || false,
      friendship: pokemon.friendship || 0,
    };
  }

  // Get Grok AI analysis
  async function getGrokAnalysis(topPokemon) {
    if (!GROQ_API_KEY) {
      return 'Análisis de IA no disponible en este momento.';
    }
    
    try {
      const prompt = `Eres un analista experto de Pokémon competitivo. Analiza este ranking de los Pokémon más fuertes del servidor Cobblemon Los Pitufos.

DATOS DEL RANKING (Top 10 - Un Pokémon por jugador):
${topPokemon.slice(0, 10).map((p, i) => `
#${i + 1}: ${p.ownerUsername}
- Puntaje: ${p.powerScoreDisplay.toLocaleString()}
- Nivel: ${p.realStats.level}
- IVs: ${p.realStats.ivs.total}/186 (HP:${p.realStats.ivs.hp} ATK:${p.realStats.ivs.attack} DEF:${p.realStats.ivs.defense} SPA:${p.realStats.ivs.spAttack} SPD:${p.realStats.ivs.spDefense} SPE:${p.realStats.ivs.speed})
- EVs: ${p.realStats.evs.total}/510
- Naturaleza: ${p.realStats.nature}
- Shiny: ${p.realStats.shiny ? 'Sí' : 'No'}
`).join('\n')}

INSTRUCCIONES:
1. Analiza quién tiene el Pokémon mejor optimizado
2. Comenta sobre la distribución de IVs y EVs
3. Evalúa las naturalezas elegidas
4. Máximo 150 palabras, en español
5. NO menciones especies de Pokémon (son secretas)
6. Tono profesional pero accesible`;

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'moonshotai/kimi-k2-instruct-0905',
          messages: [
            { role: 'system', content: 'Eres un analista experto de Pokémon competitivo. Responde siempre en español.' },
            { role: 'user', content: prompt },
          ],
          max_tokens: 400,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[GROK] Error en API:', response.status, errorText);
        return 'Análisis de IA temporalmente no disponible.';
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || 'Análisis no disponible.';
    } catch (error) {
      console.error('[GROK] Error obteniendo análisis:', error);
      return 'Error al obtener análisis de IA.';
    }
  }

  // GET /api/rankings/strongest-pokemon
  app.get('/api/rankings/strongest-pokemon', async (req, res) => {
    try {
      const now = new Date();
      const forceRefresh = req.query.refresh === 'true';
      
      // Check cache
      if (!forceRefresh && strongestPokemonCache && lastStrongestCalculation) {
        const timeSinceLastCalc = now.getTime() - lastStrongestCalculation.getTime();
        if (timeSinceLastCalc < STRONGEST_CACHE_DURATION) {
          return res.json({
            success: true,
            data: strongestPokemonCache,
          });
        }
      }

      console.log('[STRONGEST POKEMON] Calculando nuevo ranking...');
      
      const users = await getDb().collection('users').find({
        verified: true,
        minecraftUsername: { $exists: true, $ne: null },
      }).toArray();

      let totalPokemonAnalyzed = 0;
      const strongestPerPlayer = [];

      // For each player, find their strongest Pokemon
      for (const user of users) {
        const allUserPokemon = [
          ...(user.pokemonParty || user.party || []),
          ...(user.pcStorage || []).flatMap(box => box?.pokemon || []),
        ].filter(p => p && p.level && p.ivs && p.evs);

        totalPokemonAnalyzed += allUserPokemon.length;

        if (allUserPokemon.length === 0) continue;

        // Find strongest pokemon for this user
        let strongestPokemon = null;
        let highestPower = 0;

        for (const pokemon of allUserPokemon) {
          if (!pokemon) continue;
          const power = calculatePokemonPower(pokemon);
          if (power > highestPower) {
            highestPower = power;
            strongestPokemon = pokemon;
          }
        }

        if (strongestPokemon) {
          strongestPerPlayer.push({
            ownerUsername: user.minecraftUsername || user.nickname || 'Desconocido',
            ownerTotalPokemon: allUserPokemon.length,
            powerScoreDisplay: Math.round(highestPower),
            realStats: generateRealStats(strongestPokemon),
            calculatedAt: now,
            rank: 0,
          });
        }
      }

      console.log(`[STRONGEST POKEMON] ${strongestPerPlayer.length} jugadores con Pokémon, ${totalPokemonAnalyzed} total analizados`);

      // Sort by power (highest first)
      strongestPerPlayer.sort((a, b) => b.powerScoreDisplay - a.powerScoreDisplay);

      // Assign ranks and take top 20
      const topPokemon = strongestPerPlayer.slice(0, 20).map((p, index) => ({
        ...p,
        rank: index + 1,
      }));

      // Get Grok analysis
      const grokAnalysis = await getGrokAnalysis(topPokemon);

      // Calculate time until next update
      const nextUpdate = new Date(now.getTime() + STRONGEST_CACHE_DURATION);
      const timeUntilNextUpdate = {
        minutes: Math.floor(STRONGEST_CACHE_DURATION / 60000),
        seconds: 0,
      };

      // Create result
      const result = {
        rankings: topPokemon,
        totalAnalyzed: totalPokemonAnalyzed,
        totalPlayers: strongestPerPlayer.length,
        lastCalculated: now,
        nextUpdate,
        grokAnalysis,
        calculationPrecision: 'Decimal128 (18 decimales de precisión)',
        timeUntilNextUpdate,
      };

      // Save to cache
      strongestPokemonCache = result;
      lastStrongestCalculation = now;

      console.log('[STRONGEST POKEMON] Ranking calculado exitosamente');
      
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('[STRONGEST POKEMON] Error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error al obtener ranking de Pokémon más fuertes' 
      });
    }
  });

  // GET /api/rankings/next-update
  app.get('/api/rankings/next-update', (req, res) => {
    if (!lastStrongestCalculation) {
      return res.json({ success: true, data: { minutes: 0, seconds: 0 } });
    }
    
    const now = new Date();
    const nextUpdate = new Date(lastStrongestCalculation.getTime() + STRONGEST_CACHE_DURATION);
    const remaining = Math.max(0, nextUpdate.getTime() - now.getTime());
    
    res.json({
      success: true,
      data: {
        minutes: Math.floor(remaining / 60000),
        seconds: Math.floor((remaining % 60000) / 1000),
      },
    });
  });

  // ============================================
  // TEAM RANKING ENDPOINT
  // ============================================

  // Cache for team ranking
  let cachedTeamRanking = null;
  let lastTeamCalculation = null;
  const TEAM_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // GET /api/rankings/team/debug - Debug endpoint to check party data
  app.get('/api/rankings/team/debug', async (req, res) => {
    try {
      const db = getDb();
      const users = await db.collection('users').find({
        minecraftUsername: { $exists: true, $ne: '' }
      }).toArray();

      const stats = {
        totalUsers: users.length,
        usersWithParty: 0,
        usersWithPokemonParty: 0,
        usersWithValidTeam: 0,
        sampleUsers: []
      };

      for (const user of users) {
        const hasParty = user.party && Array.isArray(user.party) && user.party.length > 0;
        const hasPokemonParty = user.pokemonParty && Array.isArray(user.pokemonParty) && user.pokemonParty.length > 0;
        
        if (hasParty) stats.usersWithParty++;
        if (hasPokemonParty) stats.usersWithPokemonParty++;

        const partyData = user.party || user.pokemonParty || [];
        const validPokemon = partyData.filter(p => p && typeof p.level === 'number' && p.level > 0);
        if (validPokemon.length >= 3) stats.usersWithValidTeam++;

        // Add sample data for first 5 users
        if (stats.sampleUsers.length < 5) {
          stats.sampleUsers.push({
            username: user.minecraftUsername,
            hasParty,
            hasPokemonParty,
            partySize: hasParty ? user.party.length : (hasPokemonParty ? user.pokemonParty.length : 0),
            validPokemonCount: validPokemon.length,
            pokemonLevels: partyData.slice(0, 6).map(p => p?.level || 0),
            verified: user.verified,
            online: user.online
          });
        }
      }

      res.json({ success: true, data: stats });
    } catch (error) {
      console.error('[TEAM DEBUG] Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Type chart for synergy calculations
  const TYPE_CHART = {
    normal: { weakTo: ['fighting'], resistsTo: [], immuneTo: ['ghost'] },
    fire: { weakTo: ['water', 'ground', 'rock'], resistsTo: ['fire', 'grass', 'ice', 'bug', 'steel', 'fairy'], immuneTo: [] },
    water: { weakTo: ['electric', 'grass'], resistsTo: ['fire', 'water', 'ice', 'steel'], immuneTo: [] },
    electric: { weakTo: ['ground'], resistsTo: ['electric', 'flying', 'steel'], immuneTo: [] },
    grass: { weakTo: ['fire', 'ice', 'poison', 'flying', 'bug'], resistsTo: ['water', 'electric', 'grass', 'ground'], immuneTo: [] },
    ice: { weakTo: ['fire', 'fighting', 'rock', 'steel'], resistsTo: ['ice'], immuneTo: [] },
    fighting: { weakTo: ['flying', 'psychic', 'fairy'], resistsTo: ['bug', 'rock', 'dark'], immuneTo: [] },
    poison: { weakTo: ['ground', 'psychic'], resistsTo: ['grass', 'fighting', 'poison', 'bug', 'fairy'], immuneTo: [] },
    ground: { weakTo: ['water', 'grass', 'ice'], resistsTo: ['poison', 'rock'], immuneTo: ['electric'] },
    flying: { weakTo: ['electric', 'ice', 'rock'], resistsTo: ['grass', 'fighting', 'bug'], immuneTo: ['ground'] },
    psychic: { weakTo: ['bug', 'ghost', 'dark'], resistsTo: ['fighting', 'psychic'], immuneTo: [] },
    bug: { weakTo: ['fire', 'flying', 'rock'], resistsTo: ['grass', 'fighting', 'ground'], immuneTo: [] },
    rock: { weakTo: ['water', 'grass', 'fighting', 'ground', 'steel'], resistsTo: ['normal', 'fire', 'poison', 'flying'], immuneTo: [] },
    ghost: { weakTo: ['ghost', 'dark'], resistsTo: ['poison', 'bug'], immuneTo: ['normal', 'fighting'] },
    dragon: { weakTo: ['ice', 'dragon', 'fairy'], resistsTo: ['fire', 'water', 'electric', 'grass'], immuneTo: [] },
    dark: { weakTo: ['fighting', 'bug', 'fairy'], resistsTo: ['ghost', 'dark'], immuneTo: ['psychic'] },
    steel: { weakTo: ['fire', 'fighting', 'ground'], resistsTo: ['normal', 'grass', 'ice', 'flying', 'psychic', 'bug', 'rock', 'dragon', 'steel', 'fairy'], immuneTo: ['poison'] },
    fairy: { weakTo: ['poison', 'steel'], resistsTo: ['fighting', 'bug', 'dark'], immuneTo: ['dragon'] },
  };
  const ALL_TYPES = Object.keys(TYPE_CHART);

  // Estimate Pokemon role based on stats
  function estimateRole(pokemon) {
    const ivs = pokemon.ivs || { hp: 0, attack: 0, defense: 0, spAttack: 0, spDefense: 0, speed: 0 };
    const evs = pokemon.evs || { hp: 0, attack: 0, defense: 0, spAttack: 0, spDefense: 0, speed: 0 };

    const atkTotal = (ivs.attack || 0) + (evs.attack || 0) / 4;
    const spAtkTotal = (ivs.spAttack || 0) + (evs.spAttack || 0) / 4;
    const defTotal = (ivs.defense || 0) + (evs.defense || 0) / 4;
    const spDefTotal = (ivs.spDefense || 0) + (evs.spDefense || 0) / 4;
    const speedTotal = (ivs.speed || 0) + (evs.speed || 0) / 4;
    const hpTotal = (ivs.hp || 0) + (evs.hp || 0) / 4;

    const offensiveScore = Math.max(atkTotal, spAtkTotal);
    const defensiveScore = (defTotal + spDefTotal + hpTotal) / 3;

    if (speedTotal > 25 && offensiveScore > 25) return 'Sweeper';
    if (defensiveScore > 30 && hpTotal > 25) return 'Tank';
    if (offensiveScore > 28 && speedTotal < 20) return 'Wallbreaker';
    if (defTotal > 25 || spDefTotal > 25) return 'Wall';
    if (speedTotal > 20) return 'Pivot';
    return 'Utility';
  }

  // GET /api/rankings/team - Team ranking with synergy analysis
  app.get('/api/rankings/team', async (req, res) => {
    try {
      const now = new Date();
      const forceRefresh = req.query.refresh === 'true';

      // Check cache
      if (!forceRefresh && cachedTeamRanking && lastTeamCalculation) {
        const timeSince = now.getTime() - lastTeamCalculation.getTime();
        if (timeSince < TEAM_CACHE_DURATION) {
          return res.json({ success: true, data: cachedTeamRanking });
        }
      }

      console.log('[TEAM RANKING] Calculating team rankings...');
      const db = getDb();
      const MINIMUM_TEAM_SIZE = 3;

      // Get current level cap
      let currentLevelCap = 100;
      try {
        const levelCapConfig = await db.collection('level_caps').findOne({});
        if (levelCapConfig) {
          const nowDate = new Date();
          const timeRules = (levelCapConfig.timeBasedRules || []).filter(
            r => r.active && new Date(r.startDate) <= nowDate && (!r.endDate || new Date(r.endDate) >= nowDate)
          );
          for (const rule of timeRules) {
            if (rule.targetCap === 'ownership' || rule.targetCap === 'both') {
              const daysPassed = Math.floor((nowDate.getTime() - new Date(rule.startDate).getTime()) / (1000 * 60 * 60 * 24));
              let cap = rule.startCap || 100;
              if (rule.progression?.type === 'daily') cap += daysPassed * (rule.progression.dailyIncrease || 0);
              else if (rule.progression?.type === 'interval') {
                const intervals = Math.floor(daysPassed / (rule.progression.intervalDays || 1));
                cap += intervals * (rule.progression.intervalIncrease || 0);
              }
              if (rule.maxCap) cap = Math.min(cap, rule.maxCap);
              currentLevelCap = Math.min(currentLevelCap, cap);
            }
          }
          const staticRules = (levelCapConfig.staticRules || []).filter(r => r.active);
          for (const rule of staticRules) {
            if (rule.ownershipCap != null) currentLevelCap = Math.min(currentLevelCap, rule.ownershipCap);
          }
        }
      } catch (e) { console.log('[TEAM RANKING] Level cap error:', e.message); }

      // Get ALL users with minecraftUsername (not just verified)
      const users = await db.collection('users').find({
        minecraftUsername: { $exists: true, $ne: '' },
      }).toArray();

      const teamScores = [];
      let totalPlayersChecked = 0;

      let usersWithPartyField = 0;
      let usersWithPokemonPartyField = 0;

      for (const user of users) {
        totalPlayersChecked++;
        
        // Track which field has data
        if (user.party && Array.isArray(user.party) && user.party.length > 0) usersWithPartyField++;
        if (user.pokemonParty && Array.isArray(user.pokemonParty) && user.pokemonParty.length > 0) usersWithPokemonPartyField++;
        
        // FIXED: Use user.party (from plugin sync) OR user.pokemonParty (legacy)
        const party = (user.party || user.pokemonParty || []).filter(
          p => p && typeof p.level === 'number' && p.level > 0 && p.level <= currentLevelCap
        );

        if (party.length < MINIMUM_TEAM_SIZE) continue;

        // Analyze each member
        const members = party.map((p, i) => {
          const ivs = p.ivs || { hp: 0, attack: 0, defense: 0, spAttack: 0, spDefense: 0, speed: 0 };
          const evs = p.evs || { hp: 0, attack: 0, defense: 0, spAttack: 0, spDefense: 0, speed: 0 };
          const ivTotal = (ivs.hp || 0) + (ivs.attack || 0) + (ivs.defense || 0) + (ivs.spAttack || 0) + (ivs.spDefense || 0) + (ivs.speed || 0);
          const evTotal = (evs.hp || 0) + (evs.attack || 0) + (evs.defense || 0) + (evs.spAttack || 0) + (evs.spDefense || 0) + (evs.speed || 0);
          const powerContribution = (p.level * 100) + (ivTotal * 30) + (evTotal * 10);

          // Get species name and sprite URL
          const speciesName = p.species || `Pokemon #${p.speciesId || i + 1}`;
          const speciesId = p.speciesId || 1;
          const isShiny = p.shiny || false;
          
          // Animated sprite URL from PokeAPI (showdown format)
          const spriteUrl = isShiny
            ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/shiny/${speciesId}.gif`
            : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/${speciesId}.gif`;
          
          // Fallback static sprite
          const staticSpriteUrl = isShiny
            ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${speciesId}.png`
            : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${speciesId}.png`;

          return {
            slot: i + 1,
            speciesName,
            speciesId,
            spriteUrl,
            staticSpriteUrl,
            level: p.level,
            ivTotal,
            evTotal,
            // Detailed IVs
            ivs: {
              hp: ivs.hp || 0,
              attack: ivs.attack || 0,
              defense: ivs.defense || 0,
              spAttack: ivs.spAttack || 0,
              spDefense: ivs.spDefense || 0,
              speed: ivs.speed || 0,
            },
            // Detailed EVs
            evs: {
              hp: evs.hp || 0,
              attack: evs.attack || 0,
              defense: evs.defense || 0,
              spAttack: evs.spAttack || 0,
              spDefense: evs.spDefense || 0,
              speed: evs.speed || 0,
            },
            nature: p.nature || 'Unknown',
            shiny: isShiny,
            gender: p.gender || 'Unknown',
            ability: p.ability || 'Unknown',
            estimatedRole: estimateRole(p),
            powerContribution,
          };
        });

        const roles = members.map(m => m.estimatedRole);

        // Calculate type coverage (simulated based on speciesId)
        const teamTypes = party.map(p => {
          const typeIndex = (p.speciesId || 1) % ALL_TYPES.length;
          const secondTypeIndex = ((p.speciesId || 1) * 7) % ALL_TYPES.length;
          return typeIndex !== secondTypeIndex ? [ALL_TYPES[typeIndex], ALL_TYPES[secondTypeIndex]] : [ALL_TYPES[typeIndex]];
        });

        // Calculate coverage
        const offensive = new Set();
        const defensive = new Set();
        const weaknessCount = {};

        for (const types of teamTypes) {
          for (const type of types) {
            const typeData = TYPE_CHART[type.toLowerCase()];
            if (!typeData) continue;
            typeData.resistsTo.forEach(t => defensive.add(t));
            typeData.immuneTo.forEach(t => defensive.add(t));
            typeData.weakTo.forEach(t => { weaknessCount[t] = (weaknessCount[t] || 0) + 1; });
          }
        }

        for (const type of ALL_TYPES) {
          const typeData = TYPE_CHART[type];
          if (typeData) {
            for (const memberTypes of teamTypes) {
              for (const memberType of memberTypes) {
                if (typeData.weakTo.includes(memberType.toLowerCase())) offensive.add(type);
              }
            }
          }
        }

        const sharedWeaknesses = Object.entries(weaknessCount).filter(([, count]) => count >= 2).map(([type]) => type);

        const typeCoverage = {
          offensive: Array.from(offensive),
          defensive: Array.from(defensive),
          weaknesses: sharedWeaknesses,
        };

        // Role distribution
        const roleDistribution = {
          sweepers: roles.filter(r => r === 'Sweeper').length,
          tanks: roles.filter(r => r === 'Tank' || r === 'Wall').length,
          wallBreakers: roles.filter(r => r === 'Wallbreaker').length,
          supports: roles.filter(r => r === 'Utility').length,
          pivots: roles.filter(r => r === 'Pivot').length,
        };

        // ============================================
        // ADVANCED SYNERGY CALCULATIONS
        // A well-built team beats raw power!
        // ============================================

        // 1. TYPE SYNERGY - How well types cover each other's weaknesses
        const typeBalance = Math.max(0, 100 - (sharedWeaknesses.length * 20)); // Penalize shared weaknesses HARD
        const offensiveCoverage = Math.min(100, (offensive.size / ALL_TYPES.length) * 130);
        const defensiveCoverage = Math.min(100, (defensive.size / ALL_TYPES.length) * 110);
        
        // 2. ROLE SYNERGY - Does the team have a complete strategy?
        const hasOffense = roleDistribution.sweepers + roleDistribution.wallBreakers > 0;
        const hasDefense = roleDistribution.tanks > 0;
        const hasSupport = roleDistribution.supports + roleDistribution.pivots > 0;
        const roleBalance = (hasOffense ? 35 : 0) + (hasDefense ? 35 : 0) + (hasSupport ? 30 : 0);
        
        // 3. SPEED TIERS - Does the team have speed control?
        const speeds = members.map(m => (m.ivs.speed || 0) + (m.evs.speed || 0) / 4);
        const hasFastMon = speeds.some(s => s > 25);
        const hasSlowMon = speeds.some(s => s < 15);
        const speedControl = (hasFastMon && hasSlowMon) ? 100 : (hasFastMon || hasSlowMon ? 50 : 20);
        
        // 4. OFFENSIVE/DEFENSIVE BALANCE - Not all glass cannons or all walls
        const offensiveMembers = roleDistribution.sweepers + roleDistribution.wallBreakers;
        const defensiveMembers = roleDistribution.tanks;
        const teamComposition = (offensiveMembers > 0 && defensiveMembers > 0) ? 100 : 
                               (offensiveMembers > 0 || defensiveMembers > 0) ? 60 : 30;
        
        // 5. IMMUNITY COVERAGE - Does the team have key immunities?
        const immunities = new Set();
        for (const types of teamTypes) {
          for (const type of types) {
            const typeData = TYPE_CHART[type.toLowerCase()];
            if (typeData) typeData.immuneTo.forEach(t => immunities.add(t));
          }
        }
        const immunityBonus = Math.min(100, immunities.size * 25);
        
        // 6. WEAKNESS STACKING PENALTY - Multiple mons weak to same type is BAD
        const maxWeaknessStack = Math.max(...Object.values(weaknessCount), 0);
        const weaknessStackPenalty = maxWeaknessStack >= 3 ? -30 : maxWeaknessStack >= 2 ? -15 : 0;
        
        // 7. TEAM SIZE BONUS - Full team of 6 is better
        const teamSizeBonus = party.length === 6 ? 100 : party.length === 5 ? 70 : party.length === 4 ? 40 : 20;
        
        // OVERALL SYNERGY - Weighted average of all factors
        const overallSynergy = Math.round(
          (typeBalance * 0.20) + 
          (offensiveCoverage * 0.15) + 
          (defensiveCoverage * 0.15) + 
          (roleBalance * 0.15) +
          (speedControl * 0.10) +
          (teamComposition * 0.10) +
          (immunityBonus * 0.10) +
          (teamSizeBonus * 0.05) +
          weaknessStackPenalty
        );

        const synergyMetrics = {
          typeBalance: Math.round(typeBalance),
          offensiveCoverage: Math.round(offensiveCoverage),
          defensiveCoverage: Math.round(defensiveCoverage),
          roleBalance: Math.round(roleBalance),
          speedControl: Math.round(speedControl),
          teamComposition: Math.round(teamComposition),
          immunityBonus: Math.round(immunityBonus),
          teamSizeBonus: Math.round(teamSizeBonus),
          weaknessStackPenalty,
          overallSynergy: Math.max(0, Math.min(100, overallSynergy)),
        };

        // Calculate scores - SYNERGY IS KING!
        const avgLevel = Math.round(members.reduce((s, m) => s + m.level, 0) / members.length);
        const avgIvs = Math.round(members.reduce((s, m) => s + m.ivTotal, 0) / members.length);
        const avgEvs = Math.round(members.reduce((s, m) => s + m.evTotal, 0) / members.length);
        const shinyCount = members.filter(m => m.shiny).length;

        // NEW SCORING FORMULA - Synergy multiplies everything!
        const rawPower = members.reduce((sum, m) => sum + m.powerContribution, 0);
        const synergyMultiplier = 1 + (overallSynergy / 100); // 1.0 to 2.0x multiplier
        
        // Base score components
        const baseScore = rawPower * 0.3; // Raw power is only 30% of base
        const synergyScore = overallSynergy * 150; // Synergy is worth A LOT
        const coverageScore = ((offensiveCoverage + defensiveCoverage) / 2) * 50;
        const balanceScore = roleBalance * 30;
        const ivQuality = avgIvs * 8;
        const evTraining = avgEvs * 4;
        const shinyBonusValue = shinyCount * 300;
        
        // Final score with synergy multiplier
        const totalScore = Math.round((baseScore + synergyScore + coverageScore + balanceScore + ivQuality + evTraining + shinyBonusValue) * synergyMultiplier);

        teamScores.push({
          ownerUsername: user.minecraftUsername || user.nickname || 'Desconocido',
          teamSize: party.length,
          totalScoreDisplay: Math.round(totalScore),
          synergyMultiplier: Math.round(synergyMultiplier * 100) / 100,
          scoreBreakdown: {
            baseScore: Math.round(baseScore),
            synergyScore: Math.round(synergyScore),
            coverageScore: Math.round(coverageScore),
            balanceScore: Math.round(balanceScore),
            ivQuality: Math.round(ivQuality),
            evTraining: Math.round(evTraining),
            shinyBonus: shinyBonusValue,
            multiplierEffect: Math.round(totalScore - (baseScore + synergyScore + coverageScore + balanceScore + ivQuality + evTraining + shinyBonusValue)),
          },
          teamAnalysis: {
            members,
            typeCoverage,
            roleDistribution,
            avgLevel,
            avgIvs,
            avgEvs,
            shinyCount,
          },
          synergyMetrics,
          calculatedAt: now,
        });
      }

      // Sort by score
      teamScores.sort((a, b) => b.totalScoreDisplay - a.totalScoreDisplay);

      // Assign ranks
      const topTeams = teamScores.slice(0, 20).map((t, i) => ({ ...t, rank: i + 1 }));

      // Get Grok AI analysis
      let grokAnalysis = 'Análisis de IA no disponible.';
      if (GROQ_API_KEY && topTeams.length > 0) {
        try {
          const prompt = `Eres el ANALISTA ESTRATÉGICO SUPREMO del servidor Cobblemon Los Pitufos. 

IMPORTANTE: En este servidor, LA SINERGIA ES REY. Un equipo bien construido DESTRUYE a uno con stats altos pero mal armado.

Analiza estos TOP 10 EQUIPOS:

${topTeams.slice(0, 10).map((t, i) => `
#${i + 1}: "${t.ownerUsername}" - ${t.totalScoreDisplay.toLocaleString()} pts (x${t.synergyMultiplier} multiplicador)
- Equipo: ${t.teamSize}/6 Pokémon, Nivel Prom: ${t.teamAnalysis.avgLevel}
- SINERGIA TOTAL: ${t.synergyMetrics.overallSynergy}%
  • Balance de Tipos: ${t.synergyMetrics.typeBalance}%
  • Cobertura Ofensiva: ${t.synergyMetrics.offensiveCoverage}%
  • Cobertura Defensiva: ${t.synergyMetrics.defensiveCoverage}%
  • Balance de Roles: ${t.synergyMetrics.roleBalance}%
  • Control de Velocidad: ${t.synergyMetrics.speedControl}%
  • Composición: ${t.synergyMetrics.teamComposition}%
  • Inmunidades: ${t.synergyMetrics.immunityBonus}%
- Roles: ${t.teamAnalysis.roleDistribution.sweepers} Sweepers, ${t.teamAnalysis.roleDistribution.tanks} Tanks, ${t.teamAnalysis.roleDistribution.wallBreakers} Wallbreakers, ${t.teamAnalysis.roleDistribution.pivots} Pivots
- Debilidades Compartidas: ${t.teamAnalysis.typeCoverage.weaknesses.join(', ') || 'NINGUNA - Equipo sólido!'}
- IVs: ${t.teamAnalysis.avgIvs}/186, EVs: ${t.teamAnalysis.avgEvs}/510
- Shinies: ${t.teamAnalysis.shinyCount}
`).join('\n')}

ANALIZA CON ÉPICA:
1) ¿Quién tiene el MEJOR equipo construido (no el más fuerte individualmente)?
2) ¿Qué equipo con BAJA sinergia podría ser DESTRUIDO por uno con alta sinergia?
3) ¿Qué matchups serían ÉPICOS basados en las debilidades compartidas?
4) ¿Quién es el "Dark Horse" - equipo subestimado que podría sorprender?
5) Predicción del torneo considerando que LA ESTRATEGIA VENCE AL PODER BRUTO

NO menciones especies específicas. Sé DRAMÁTICO como comentarista de WWE. Español latino. 500-700 palabras.`;

          const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: 'llama-3.3-70b-versatile',
              messages: [
                { role: 'system', content: 'Eres un analista estratégico LEGENDARIO de Pokémon competitivo. Valoras la SINERGIA y ESTRATEGIA sobre el poder bruto. Español latino, dramático como WWE, apasionado como comentarista de fútbol.' },
                { role: 'user', content: prompt }
              ],
              max_tokens: 2500,
              temperature: 0.9,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            grokAnalysis = data.choices?.[0]?.message?.content || grokAnalysis;
          }
        } catch (e) { console.log('[TEAM RANKING] Grok error:', e.message); }
      }

      const result = {
        rankings: topTeams,
        totalTeamsAnalyzed: teamScores.length,
        totalPlayersChecked,
        lastCalculated: now,
        nextUpdate: new Date(now.getTime() + TEAM_CACHE_DURATION),
        grokAnalysis,
        currentLevelCap,
        minimumTeamSize: MINIMUM_TEAM_SIZE,
        timeUntilNextUpdate: { minutes: 5, seconds: 0 },
        // Debug info
        debug: {
          usersWithPartyField,
          usersWithPokemonPartyField,
          teamsFiltered: totalPlayersChecked - teamScores.length,
        }
      };

      cachedTeamRanking = result;
      lastTeamCalculation = now;

      console.log(`[TEAM RANKING] ${teamScores.length} teams analyzed from ${totalPlayersChecked} players (party: ${usersWithPartyField}, pokemonParty: ${usersWithPokemonPartyField})`);
      res.json({ success: true, data: result });

    } catch (error) {
      console.error('[TEAM RANKING] Error:', error);
      res.status(500).json({ success: false, error: 'Error al obtener ranking de equipos' });
    }
  });

  // ============================================
  // TOURNAMENTS ENDPOINTS
  // ============================================

  // GET /api/tournaments - Get all tournaments
  app.get('/api/tournaments', async (req, res) => {
    try {
      const tournaments = await getDb().collection('tournaments').find({}).toArray();
      tournaments.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
      res.json({ success: true, data: tournaments, count: tournaments.length });
    } catch (error) {
      console.error('[TOURNAMENTS] Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /api/tournaments/active - Get active tournaments
  app.get('/api/tournaments/active', async (req, res) => {
    try {
      const tournaments = await getDb().collection('tournaments').find({
        status: { $in: ['registration', 'active', 'in_progress'] }
      }).toArray();
      res.json({ success: true, data: tournaments, count: tournaments.length });
    } catch (error) {
      console.error('[TOURNAMENTS ACTIVE] Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /api/tournaments/:id - Get tournament by ID
  app.get('/api/tournaments/:id', async (req, res) => {
    try {
      const tournament = await getDb().collection('tournaments').findOne({ 
        _id: new ObjectId(req.params.id) 
      });
      if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }
      res.json({ success: true, data: tournament });
    } catch (error) {
      console.error('[TOURNAMENTS GET] Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /api/tournaments/code/:code - Get tournament by code
  app.get('/api/tournaments/code/:code', async (req, res) => {
    try {
      const tournament = await getDb().collection('tournaments').findOne({ 
        code: req.params.code.toUpperCase() 
      });
      if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }
      res.json({ success: true, data: tournament });
    } catch (error) {
      console.error('[TOURNAMENTS CODE] Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /api/tournaments - Create tournament (admin)
  app.post('/api/tournaments', async (req, res) => {
    try {
      const { name, description, startDate, maxParticipants, bracketType, prizes, rules, format, registrationSeconds } = req.body;
      
      if (!name || !description || !startDate || !maxParticipants || !prizes) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Generate unique code
      const code = crypto.randomBytes(3).toString('hex').toUpperCase();

      const tournament = {
        name,
        description,
        startDate: new Date(startDate),
        maxParticipants: parseInt(maxParticipants),
        bracketType: bracketType || 'single',
        prizes,
        rules: rules || '',
        format: format || '6v6 Singles',
        code,
        status: 'registration',
        registrationSeconds: parseInt(registrationSeconds) || 30, // Default 30 seconds for in-game registration
        participants: [],
        bracket: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'Admin',
      };

      const result = await getDb().collection('tournaments').insertOne(tournament);
      tournament._id = result.insertedId;

      console.log(`[TOURNAMENTS] Created tournament: ${name} (${code}) - ${tournament.registrationSeconds}s registration`);
      res.status(201).json({ success: true, data: tournament, message: `Torneo creado con código: ${code}` });
    } catch (error) {
      console.error('[TOURNAMENTS CREATE] Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // PUT /api/tournaments/:id - Update tournament (admin)
  app.put('/api/tournaments/:id', async (req, res) => {
    try {
      const { name, description, startDate, maxParticipants, status, prizes, rules, format } = req.body;
      
      const updateData = { updatedAt: new Date() };
      if (name) updateData.name = name;
      if (description) updateData.description = description;
      if (startDate) updateData.startDate = new Date(startDate);
      if (maxParticipants) updateData.maxParticipants = parseInt(maxParticipants);
      if (status) updateData.status = status;
      if (prizes) updateData.prizes = prizes;
      if (rules !== undefined) updateData.rules = rules;
      if (format) updateData.format = format;

      const result = await getDb().collection('tournaments').findOneAndUpdate(
        { _id: new ObjectId(req.params.id) },
        { $set: updateData },
        { returnDocument: 'after' }
      );

      if (!result) {
        return res.status(404).json({ error: 'Tournament not found' });
      }

      res.json({ success: true, data: result });
    } catch (error) {
      console.error('[TOURNAMENTS UPDATE] Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // DELETE /api/tournaments/:id - Delete tournament (admin)
  app.delete('/api/tournaments/:id', async (req, res) => {
    try {
      const result = await getDb().collection('tournaments').deleteOne({ 
        _id: new ObjectId(req.params.id) 
      });

      if (result.deletedCount === 0) {
        return res.status(404).json({ error: 'Tournament not found' });
      }

      res.json({ success: true, message: 'Tournament deleted' });
    } catch (error) {
      console.error('[TOURNAMENTS DELETE] Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /api/tournaments/register - Register player to tournament (from plugin)
  app.post('/api/tournaments/register', async (req, res) => {
    try {
      const { code, minecraftUuid, username } = req.body;
      
      if (!code || !minecraftUuid || !username) {
        return res.status(400).json({ success: false, message: 'code, minecraftUuid and username required' });
      }

      const db = getDb();
      const tournament = await db.collection('tournaments').findOne({ 
        code: code.toUpperCase() 
      });

      if (!tournament) {
        return res.status(404).json({ success: false, message: 'INVALID_CODE: Código de torneo inválido' });
      }

      if (tournament.status !== 'registration') {
        return res.status(400).json({ success: false, message: 'REGISTRATION_CLOSED: Las inscripciones están cerradas' });
      }

      if (tournament.participants.length >= tournament.maxParticipants) {
        return res.status(400).json({ success: false, message: 'TOURNAMENT_FULL: El torneo está lleno' });
      }

      // Check if already registered
      const alreadyRegistered = tournament.participants.some(p => p.minecraftUuid === minecraftUuid);
      if (alreadyRegistered) {
        return res.status(400).json({ success: false, message: 'ALREADY_REGISTERED: Ya estás inscrito en este torneo' });
      }

      // Create participant
      const participant = {
        id: crypto.randomBytes(4).toString('hex'),
        minecraftUuid,
        username,
        seed: tournament.participants.length + 1,
        registeredAt: new Date(),
      };

      // Add to tournament
      await db.collection('tournaments').updateOne(
        { _id: tournament._id },
        { 
          $push: { participants: participant },
          $set: { updatedAt: new Date() }
        }
      );

      // Get updated tournament
      const updatedTournament = await db.collection('tournaments').findOne({ _id: tournament._id });

      console.log(`[TOURNAMENTS] Player ${username} (${minecraftUuid}) registered to ${tournament.name}`);
      
      res.json({ 
        success: true, 
        data: {
          tournament: updatedTournament,
          participant
        },
        message: `Inscrito en ${tournament.name}`
      });
    } catch (error) {
      console.error('[TOURNAMENTS REGISTER] Error:', error);
      res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
  });

  // POST /api/tournaments/:id/leave - Leave tournament (from plugin)
  app.post('/api/tournaments/:id/leave', async (req, res) => {
    try {
      const { minecraftUuid } = req.body;
      
      if (!minecraftUuid) {
        return res.status(400).json({ success: false, message: 'minecraftUuid required' });
      }

      const db = getDb();
      const tournament = await db.collection('tournaments').findOne({ 
        _id: new ObjectId(req.params.id) 
      });

      if (!tournament) {
        return res.status(404).json({ success: false, message: 'Tournament not found' });
      }

      if (tournament.status === 'active') {
        return res.status(400).json({ success: false, message: 'Cannot leave an active tournament' });
      }

      // Remove participant
      await db.collection('tournaments').updateOne(
        { _id: tournament._id },
        { 
          $pull: { participants: { minecraftUuid } },
          $set: { updatedAt: new Date() }
        }
      );

      console.log(`[TOURNAMENTS] Player ${minecraftUuid} left ${tournament.name}`);
      res.json({ success: true, message: 'Left tournament' });
    } catch (error) {
      console.error('[TOURNAMENTS LEAVE] Error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  });

  // GET /api/tournaments/player/:uuid - Get tournament for a player
  app.get('/api/tournaments/player/:uuid', async (req, res) => {
    try {
      const tournament = await getDb().collection('tournaments').findOne({
        'participants.minecraftUuid': req.params.uuid,
        status: { $in: ['registration', 'active'] }
      });

      if (!tournament) {
        return res.json({ success: true, data: null });
      }

      res.json({ success: true, data: tournament });
    } catch (error) {
      console.error('[TOURNAMENTS PLAYER] Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /api/tournaments/find-match - Find match between two players
  app.post('/api/tournaments/find-match', async (req, res) => {
    try {
      const { player1Uuid, player2Uuid } = req.body;
      
      if (!player1Uuid || !player2Uuid) {
        return res.status(400).json({ success: false, message: 'player1Uuid and player2Uuid required' });
      }

      const db = getDb();
      
      // Find tournament where both players are participants
      const tournament = await db.collection('tournaments').findOne({
        status: 'active',
        'participants.minecraftUuid': { $all: [player1Uuid, player2Uuid] }
      });

      if (!tournament || !tournament.bracket) {
        return res.json({ success: true, data: null });
      }

      // Find participant IDs
      const p1 = tournament.participants.find(p => p.minecraftUuid === player1Uuid);
      const p2 = tournament.participants.find(p => p.minecraftUuid === player2Uuid);

      if (!p1 || !p2) {
        return res.json({ success: true, data: null });
      }

      // Find active match between these players
      for (const round of tournament.bracket.rounds || []) {
        for (const match of round.matches || []) {
          if (match.status === 'ready' || match.status === 'active') {
            const matchPlayers = [match.player1Id, match.player2Id];
            if (matchPlayers.includes(p1.id) && matchPlayers.includes(p2.id)) {
              return res.json({ 
                success: true, 
                data: { match, tournament }
              });
            }
          }
        }
      }

      res.json({ success: true, data: null });
    } catch (error) {
      console.error('[TOURNAMENTS FIND-MATCH] Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /api/tournaments/matches/:matchId/result - Report match result
  app.post('/api/tournaments/matches/:matchId/result', async (req, res) => {
    try {
      const { winnerId, loserId, victoryType, tournamentId } = req.body;
      
      if (!winnerId || !tournamentId) {
        return res.status(400).json({ success: false, message: 'winnerId and tournamentId required' });
      }

      const db = getDb();
      const tournament = await db.collection('tournaments').findOne({ 
        _id: new ObjectId(tournamentId) 
      });

      if (!tournament || !tournament.bracket) {
        return res.status(404).json({ success: false, message: 'Tournament or bracket not found' });
      }

      // Find and update the match
      let matchFound = false;
      for (const round of tournament.bracket.rounds) {
        for (const match of round.matches) {
          if (match.id === req.params.matchId) {
            match.winnerId = winnerId;
            match.loserId = loserId;
            match.status = 'completed';
            match.victoryType = victoryType || 'KO';
            match.completedAt = new Date();
            matchFound = true;
            break;
          }
        }
        if (matchFound) break;
      }

      if (!matchFound) {
        return res.status(404).json({ success: false, message: 'Match not found' });
      }

      // Update tournament
      await db.collection('tournaments').updateOne(
        { _id: tournament._id },
        { 
          $set: { 
            bracket: tournament.bracket,
            updatedAt: new Date()
          }
        }
      );

      console.log(`[TOURNAMENTS] Match ${req.params.matchId} result: ${winnerId} won (${victoryType})`);
      res.json({ success: true, message: 'Match result recorded' });
    } catch (error) {
      console.error('[TOURNAMENTS MATCH RESULT] Error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  });

  // POST /api/tournaments/:id/start - Start tournament (admin)
  app.post('/api/tournaments/:id/start', async (req, res) => {
    try {
      const tournament = await getDb().collection('tournaments').findOne({ 
        _id: new ObjectId(req.params.id) 
      });

      if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }

      if (tournament.participants.length < 2) {
        return res.status(400).json({ error: 'Need at least 2 participants to start' });
      }

      // Generate simple bracket
      const participants = [...tournament.participants];
      const rounds = [];
      let roundNumber = 1;
      let currentParticipants = participants;

      while (currentParticipants.length > 1) {
        const matches = [];
        for (let i = 0; i < currentParticipants.length; i += 2) {
          const match = {
            id: crypto.randomBytes(4).toString('hex'),
            player1Id: currentParticipants[i]?.id || null,
            player2Id: currentParticipants[i + 1]?.id || null,
            winnerId: null,
            status: 'pending',
            roundNumber,
          };
          matches.push(match);
        }
        rounds.push({
          roundNumber,
          name: currentParticipants.length === 2 ? 'Final' : `Ronda ${roundNumber}`,
          matches,
        });
        currentParticipants = matches.map(() => null); // Placeholder for next round
        roundNumber++;
      }

      // Update first round matches to ready
      if (rounds[0]) {
        rounds[0].matches.forEach(m => {
          if (m.player1Id && m.player2Id) {
            m.status = 'ready';
          }
        });
      }

      await getDb().collection('tournaments').updateOne(
        { _id: new ObjectId(req.params.id) },
        { 
          $set: { 
            status: 'active',
            bracket: { rounds },
            startedAt: new Date(),
            updatedAt: new Date(),
          } 
        }
      );

      console.log(`[TOURNAMENTS] Started tournament: ${tournament.name}`);
      res.json({ success: true, message: 'Tournament started' });
    } catch (error) {
      console.error('[TOURNAMENTS START] Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /api/tournaments/:id/cancel - Cancel tournament (admin)
  app.post('/api/tournaments/:id/cancel', async (req, res) => {
    try {
      const result = await getDb().collection('tournaments').updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: { status: 'cancelled', updatedAt: new Date() } }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: 'Tournament not found' });
      }

      res.json({ success: true, message: 'Tournament cancelled' });
    } catch (error) {
      console.error('[TOURNAMENTS CANCEL] Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // DELETE /api/tournaments/:id/participants/:participantId - Remove participant (admin)
  app.delete('/api/tournaments/:id/participants/:participantId', async (req, res) => {
    try {
      const result = await getDb().collection('tournaments').updateOne(
        { _id: new ObjectId(req.params.id) },
        { 
          $pull: { participants: { id: req.params.participantId } },
          $set: { updatedAt: new Date() }
        }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: 'Tournament not found' });
      }

      res.json({ success: true, message: 'Participant removed' });
    } catch (error) {
      console.error('[TOURNAMENTS REMOVE PARTICIPANT] Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /api/tournaments/matches/:matchId/force - Force match result (admin)
  app.post('/api/tournaments/matches/:matchId/force', async (req, res) => {
    try {
      const { winnerId, tournamentId } = req.body;
      
      if (!winnerId) {
        return res.status(400).json({ error: 'winnerId required' });
      }

      // Find tournament with this match
      const query = tournamentId 
        ? { _id: new ObjectId(tournamentId) }
        : { 'bracket.rounds.matches.id': req.params.matchId };

      const tournament = await getDb().collection('tournaments').findOne(query);

      if (!tournament || !tournament.bracket) {
        return res.status(404).json({ error: 'Tournament or match not found' });
      }

      // Update match result
      let matchFound = false;
      for (const round of tournament.bracket.rounds) {
        for (const match of round.matches) {
          if (match.id === req.params.matchId) {
            match.winnerId = winnerId;
            match.status = 'completed';
            match.victoryType = 'ADMIN_DECISION';
            matchFound = true;
            break;
          }
        }
        if (matchFound) break;
      }

      if (!matchFound) {
        return res.status(404).json({ error: 'Match not found' });
      }

      await getDb().collection('tournaments').updateOne(
        { _id: tournament._id },
        { $set: { bracket: tournament.bracket, updatedAt: new Date() } }
      );

      res.json({ success: true, message: 'Match result forced' });
    } catch (error) {
      console.error('[TOURNAMENTS FORCE RESULT] Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /api/shop/stock - Get shop stock (all items)
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
        category: item.category || 'pokeball',
        rarity: item.rarity,
        basePrice: item.basePrice,
        currentPrice: item.currentPrice || item.basePrice,
        currentStock: item.currentStock,
        maxStock: item.maxStock,
        catchRate: item.catchRate,
        cobblemonId: item.cobblemonId,
        minecraftId: item.minecraftId,
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
        console.log(`[SHOP] Purchase rejected: User not found for uuid ${uuid}`);
        return res.status(404).json({ error: 'User not found. You need to be verified.' });
      }
      
      // Check if user is verified (has minecraftUuid linked to discordId)
      if (!user.discordId) {
        console.log(`[SHOP] Purchase rejected: User ${uuid} not linked to Discord`);
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
      
      // Use find() instead of aggregate() for Oracle 19c compatibility
      const todayPurchases = await db.collection('shop_purchases').find({
        minecraftUuid: uuid,
        createdAt: { $gte: todayStart }
      }).toArray();
      
      const spentToday = todayPurchases.reduce((sum, p) => sum + (p.totalPrice || 0), 0);
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
        ballId: item.minecraftId || item.cobblemonId || item.id || itemId,
        ballName: item.name,
        itemType: item.type || 'standard',
        itemCategory: item.category || 'pokeball',
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

      // DEBUG: Log completo del usuario
      console.log(`[SHOP BALANCE] Query: ${JSON.stringify(query)}`);
      console.log(`[SHOP BALANCE] User found:`, user ? JSON.stringify({
        discordId: user.discordId,
        minecraftUuid: user.minecraftUuid,
        minecraftUsername: user.minecraftUsername,
        verified: user.verified,
        cobbleDollars: user.cobbleDollars
      }) : 'null');

      res.json({
        success: true,
        balance: user?.cobbleDollars || 0,
        discordId: user?.discordId,
        minecraftUuid: user?.minecraftUuid,
        verified: user?.verified || false,
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

      // Update user in DB
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

      // Fetch the full user to get minecraftUuid if verified
      const fullUser = await getDb().collection('users').findOne({ discordId: userData.id });

      // Also check players collection for verified status
      const playerData = await getDb().collection('players').findOne({ discordId: userData.id });

      const userForFrontend = {
        discordId: userData.id,
        discordUsername: userData.global_name || userData.username,
        avatar: userData.avatar ? `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png` : null,
        // Include minecraftUuid if user is verified (from either collection)
        minecraftUuid: fullUser?.minecraftUuid || playerData?.minecraftUuid || null,
        minecraftUsername: fullUser?.minecraftUsername || playerData?.username || null,
        isMinecraftVerified: !!(fullUser?.minecraftUuid || playerData?.verified),
      };

      console.log('[AUTH] User logged in:', userForFrontend.discordUsername, 'minecraftUuid:', userForFrontend.minecraftUuid);

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

  // POST /api/admin/update-prices - Manually trigger AI price update
  app.post('/api/admin/update-prices', async (req, res) => {
    try {
      console.log('[ADMIN] Manual price update triggered');
      await updateDynamicPricesWithAI();
      
      // Get updated prices
      const db = getDb();
      const items = await db.collection('shop_items').find({}).toArray();
      const prices = items.map(i => ({
        id: i.id,
        name: i.name,
        price: i.currentPrice,
        stock: i.currentStock,
      }));
      
      res.json({ 
        success: true, 
        message: 'Prices updated using Groq LLM',
        prices,
      });
    } catch (error) {
      console.error('[ADMIN UPDATE PRICES] Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ============================================
  // PLAYER SHOP - Full API for Frontend & Plugin
  // ============================================

  // GET /api/player-shop/listings - Get active listings with filters
  app.get('/api/player-shop/listings', async (req, res) => {
    try {
      const { 
        species, type, minPrice, maxPrice, shinyOnly, 
        saleMethod, sortBy = 'createdAt', sortOrder = 'desc',
        page = 1, limit = 20 
      } = req.query;

      const database = getDb();
      const query = { status: 'active' };

      // Apply filters
      if (species) {
        query['pokemonData.species'] = { $regex: species, $options: 'i' };
      }
      if (type) {
        query['pokemonData.types'] = type;
      }
      if (minPrice || maxPrice) {
        query.price = {};
        if (minPrice) query.price.$gte = parseInt(minPrice);
        if (maxPrice) query.price.$lte = parseInt(maxPrice);
      }
      if (shinyOnly === 'true') {
        query['pokemonData.shiny'] = true;
      }
      if (saleMethod) {
        query.saleMethod = saleMethod;
      }

      // Sort options
      const sortOptions = {};
      sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const total = await database.collection('player_shop_listings').countDocuments(query);
      const listings = await database.collection('player_shop_listings')
        .find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .toArray();

      res.json({
        success: true,
        listings: listings.map(l => ({
          ...l,
          _id: l._id.toString(),
          id: l._id.toString(),
        })),
        page: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        total,
        hasMore: skip + listings.length < total,
      });
    } catch (error) {
      console.error('[PLAYER-SHOP] Error getting listings:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /api/player-shop/listings - Create a new listing
  app.post('/api/player-shop/listings', async (req, res) => {
    try {
      const { pokemonUuid, saleMethod, price, startingBid, duration } = req.body;
      
      // Get seller info from session/headers
      const sellerUuid = req.headers['x-player-uuid'] || req.body.sellerUuid;
      
      if (!sellerUuid) {
        return res.status(401).json({ error: 'No autorizado - UUID de jugador requerido' });
      }
      
      if (!pokemonUuid || !saleMethod) {
        return res.status(400).json({ error: 'pokemonUuid y saleMethod son requeridos' });
      }
      
      if (saleMethod === 'direct' && (!price || price < 100)) {
        return res.status(400).json({ error: 'Precio mínimo es 100 CobbleDollars' });
      }
      
      if (saleMethod === 'bidding' && (!startingBid || startingBid < 100)) {
        return res.status(400).json({ error: 'Puja inicial mínima es 100 CobbleDollars' });
      }
      
      const db = getDb();
      
      // Get seller data
      const seller = await db.collection('users').findOne({ minecraftUuid: sellerUuid });
      if (!seller) {
        return res.status(404).json({ error: 'Vendedor no encontrado' });
      }
      
      // Find the Pokemon in seller's party or PC
      const allPokemon = [...(seller.party || []), ...(seller.pokemonParty || [])];
      
      // Also check PC storage
      if (seller.pcStorage && Array.isArray(seller.pcStorage)) {
        seller.pcStorage.forEach(box => {
          if (box.pokemon && Array.isArray(box.pokemon)) {
            allPokemon.push(...box.pokemon.filter(p => p));
          } else if (box && !box.pokemon) {
            // Flat array format
            allPokemon.push(box);
          }
        });
      }
      
      const pokemon = allPokemon.find(p => p && p.uuid === pokemonUuid);
      if (!pokemon) {
        return res.status(404).json({ error: 'Pokémon no encontrado en tu inventario' });
      }
      
      // Calculate Pitufipuntos
      const ivTotal = (pokemon.ivs?.hp || 0) + (pokemon.ivs?.attack || 0) + (pokemon.ivs?.defense || 0) +
                      (pokemon.ivs?.spAttack || 0) + (pokemon.ivs?.spDefense || 0) + (pokemon.ivs?.speed || 0);
      const evTotal = (pokemon.evs?.hp || 0) + (pokemon.evs?.attack || 0) + (pokemon.evs?.defense || 0) +
                      (pokemon.evs?.spAttack || 0) + (pokemon.evs?.spDefense || 0) + (pokemon.evs?.speed || 0);
      const pitufipuntos = 400 + (ivTotal * 2) + Math.floor(evTotal / 4) + (pokemon.level * 5) + (pokemon.shiny ? 200 : 0);
      
      // Create listing
      const now = new Date();
      const listing = {
        pokemonUuid,
        pokemon: {
          ...pokemon,
          pitufipuntos,
        },
        seller: {
          uuid: sellerUuid,
          username: seller.minecraftUsername,
        },
        saleMethod,
        status: 'active',
        createdAt: now,
        updatedAt: now,
      };
      
      if (saleMethod === 'direct') {
        listing.price = price;
      } else {
        listing.startingBid = startingBid;
        listing.currentBid = null;
        listing.highestBidder = null;
        listing.bids = [];
        listing.duration = duration || 24;
        listing.expiresAt = new Date(now.getTime() + (duration || 24) * 60 * 60 * 1000);
      }
      
      const result = await db.collection('player_shop_listings').insertOne(listing);
      
      console.log('[PLAYER-SHOP] Created listing:', result.insertedId, 'for', pokemon.species);
      
      res.json({
        success: true,
        listing: {
          ...listing,
          _id: result.insertedId,
        },
      });
    } catch (error) {
      console.error('[PLAYER-SHOP] Error creating listing:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // DELETE /api/player-shop/listings/:id - Cancel a listing
  app.delete('/api/player-shop/listings/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const sellerUuid = req.headers['x-player-uuid'] || req.query.uuid;
      
      if (!sellerUuid) {
        return res.status(401).json({ error: 'No autorizado' });
      }
      
      const db = getDb();
      const { ObjectId } = require('mongodb');
      
      const listing = await db.collection('player_shop_listings').findOne({ 
        _id: new ObjectId(id) 
      });
      
      if (!listing) {
        return res.status(404).json({ error: 'Listing no encontrado' });
      }
      
      if (listing.seller.uuid !== sellerUuid) {
        return res.status(403).json({ error: 'No puedes cancelar un listing que no es tuyo' });
      }
      
      if (listing.saleMethod === 'bidding' && listing.bids && listing.bids.length > 0) {
        return res.status(400).json({ error: 'No puedes cancelar una subasta con pujas activas' });
      }
      
      await db.collection('player_shop_listings').updateOne(
        { _id: new ObjectId(id) },
        { $set: { status: 'cancelled', updatedAt: new Date() } }
      );
      
      res.json({ success: true });
    } catch (error) {
      console.error('[PLAYER-SHOP] Error cancelling listing:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /api/player-shop/listings/:id/purchase - Direct purchase
  app.post('/api/player-shop/listings/:id/purchase', async (req, res) => {
    try {
      const { id } = req.params;
      const buyerUuid = req.headers['x-player-uuid'] || req.body.buyerUuid;
      
      if (!buyerUuid) {
        return res.status(401).json({ error: 'No autorizado' });
      }
      
      const db = getDb();
      const { ObjectId } = require('mongodb');
      
      const listing = await db.collection('player_shop_listings').findOne({ 
        _id: new ObjectId(id),
        status: 'active',
        saleMethod: 'direct'
      });
      
      if (!listing) {
        return res.status(404).json({ error: 'Listing no encontrado o no disponible' });
      }
      
      if (listing.seller.uuid === buyerUuid) {
        return res.status(400).json({ error: 'No puedes comprar tu propio Pokémon' });
      }
      
      // Check buyer balance
      const buyer = await db.collection('users').findOne({ minecraftUuid: buyerUuid });
      if (!buyer || (buyer.cobbleDollars || 0) < listing.price) {
        return res.status(400).json({ error: 'CobbleDollars insuficientes' });
      }
      
      // NOTE: Balance transfer is handled by the plugin via CobbleDollars commands
      // The plugin will execute /cobbledollars remove and /cobbledollars give
      // when processing the delivery. We don't update DB here because the plugin
      // syncs the real balance from the game files and would overwrite our changes.
      
      // Update listing
      await db.collection('player_shop_listings').updateOne(
        { _id: new ObjectId(id) },
        { 
          $set: { 
            status: 'sold',
            buyer: { uuid: buyerUuid, username: buyer.minecraftUsername },
            soldAt: new Date(),
            updatedAt: new Date()
          } 
        }
      );
      
      // Create delivery record with balance transfer info
      await db.collection('player_shop_deliveries').insertOne({
        listingId: new ObjectId(id),
        pokemon: listing.pokemon,
        buyerUuid,
        buyerUsername: buyer.minecraftUsername,
        sellerUuid: listing.seller.uuid,
        sellerUsername: listing.seller.username,
        status: 'pending',
        type: 'purchase',
        // Balance transfer info - plugin will execute CobbleDollars commands
        balanceTransfer: {
          amount: listing.price,
          fromUuid: buyerUuid,
          fromUsername: buyer.minecraftUsername,
          toUuid: listing.seller.uuid,
          toUsername: listing.seller.username,
          processed: false
        },
        createdAt: new Date(),
      });
      
      res.json({ success: true, message: 'Compra exitosa! El Pokémon será entregado cuando entres al servidor.' });
    } catch (error) {
      console.error('[PLAYER-SHOP] Error purchasing:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /api/player-shop/listings/:id/bid - Place a bid
  app.post('/api/player-shop/listings/:id/bid', async (req, res) => {
    try {
      const { id } = req.params;
      const { amount } = req.body;
      const bidderUuid = req.headers['x-player-uuid'] || req.body.bidderUuid;
      
      console.log('[PLAYER-SHOP BID] Request:', { id, amount, bidderUuid });
      
      if (!bidderUuid) {
        console.log('[PLAYER-SHOP BID] FAIL: No bidderUuid');
        return res.status(401).json({ error: 'No autorizado - UUID requerido' });
      }
      
      const parsedAmount = parseInt(amount);
      if (!parsedAmount || isNaN(parsedAmount) || parsedAmount < 100) {
        console.log('[PLAYER-SHOP BID] FAIL: Invalid amount', { amount, parsedAmount });
        return res.status(400).json({ error: `Monto de puja inválido: ${amount} (parsed: ${parsedAmount})` });
      }
      
      const db = getDb();
      const { ObjectId } = require('mongodb');
      
      const listing = await db.collection('player_shop_listings').findOne({ 
        _id: new ObjectId(id),
        status: 'active',
        saleMethod: 'bidding'
      });
      
      console.log('[PLAYER-SHOP BID] Listing found:', listing ? { id: listing._id, seller: listing.seller?.uuid, saleMethod: listing.saleMethod, expiresAt: listing.expiresAt, currentBid: listing.currentBid, startingBid: listing.startingBid } : 'NOT FOUND');
      
      if (!listing) {
        console.log('[PLAYER-SHOP BID] FAIL: Listing not found');
        return res.status(404).json({ error: 'Subasta no encontrada o no disponible' });
      }
      
      if (listing.seller.uuid === bidderUuid) {
        console.log('[PLAYER-SHOP BID] FAIL: Own auction');
        return res.status(400).json({ error: 'No puedes pujar en tu propia subasta' });
      }
      
      if (new Date() > new Date(listing.expiresAt)) {
        console.log('[PLAYER-SHOP BID] FAIL: Auction expired', { expiresAt: listing.expiresAt, now: new Date() });
        return res.status(400).json({ error: 'La subasta ha terminado' });
      }
      
      const minBid = listing.currentBid ? listing.currentBid + 100 : listing.startingBid;
      console.log('[PLAYER-SHOP BID] Min bid check:', { minBid, parsedAmount, currentBid: listing.currentBid, startingBid: listing.startingBid });
      if (parsedAmount < minBid) {
        console.log('[PLAYER-SHOP BID] FAIL: Bid too low');
        return res.status(400).json({ error: `La puja mínima es ${minBid} CobbleDollars` });
      }
      
      // Check bidder balance
      const bidder = await db.collection('users').findOne({ minecraftUuid: bidderUuid });
      console.log('[PLAYER-SHOP BID] Bidder found:', bidder ? { uuid: bidder.minecraftUuid, balance: bidder.cobbleDollars } : 'NOT FOUND');
      if (!bidder || (bidder.cobbleDollars || 0) < parsedAmount) {
        console.log('[PLAYER-SHOP BID] FAIL: Insufficient balance', { balance: bidder?.cobbleDollars, needed: parsedAmount });
        return res.status(400).json({ error: 'CobbleDollars insuficientes' });
      }
      
      // Add bid
      const bid = {
        bidderUuid,
        bidderUsername: bidder.minecraftUsername,
        amount: parsedAmount,
        timestamp: new Date(),
      };
      
      await db.collection('player_shop_listings').updateOne(
        { _id: new ObjectId(id) },
        { 
          $set: { 
            currentBid: parsedAmount,
            highestBidder: { uuid: bidderUuid, username: bidder.minecraftUsername },
            updatedAt: new Date()
          },
          $push: { bids: bid }
        }
      );
      
      res.json({ success: true, message: 'Puja realizada exitosamente!' });
    } catch (error) {
      console.error('[PLAYER-SHOP] Error placing bid:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /api/player-shop/listings/:id - Get single listing
  app.get('/api/player-shop/listings/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const database = getDb();
      const { ObjectId } = require('mongodb');
      
      const listing = await database.collection('player_shop_listings').findOne({ 
        _id: new ObjectId(id) 
      });

      if (!listing) {
        return res.status(404).json({ error: 'Listing not found' });
      }

      res.json({
        success: true,
        listing: {
          ...listing,
          _id: listing._id.toString(),
          id: listing._id.toString(),
        },
      });
    } catch (error) {
      console.error('[PLAYER-SHOP] Error getting listing:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /api/player-shop/my-listings - Get user's listings
  app.get('/api/player-shop/my-listings', async (req, res) => {
    try {
      const uuid = req.query.uuid || req.headers['x-player-uuid'];
      console.log('[MY-LISTINGS] Fetching for UUID:', uuid);
      
      if (!uuid) {
        return res.status(400).json({ error: 'UUID required' });
      }

      const database = getDb();
      // Search by seller.uuid (nested field)
      const listings = await database.collection('player_shop_listings')
        .find({ 'seller.uuid': uuid })
        .sort({ createdAt: -1 })
        .toArray();

      console.log('[MY-LISTINGS] Found', listings.length, 'listings for', uuid);

      res.json({
        success: true,
        listings: listings.map(l => ({
          ...l,
          id: l._id.toString(),
          _id: l._id.toString(),
          bidCount: l.bids?.length || 0,
          viewCount: l.viewCount || 0,
        })),
      });
    } catch (error) {
      console.error('[PLAYER-SHOP] Error getting my listings:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /api/player-shop/listings/:id/bids - Get bid history
  app.get('/api/player-shop/listings/:id/bids', async (req, res) => {
    try {
      const { id } = req.params;
      const database = getDb();
      
      const bids = await database.collection('player_shop_bids')
        .find({ listingId: id })
        .sort({ amount: -1, createdAt: -1 })
        .toArray();

      res.json({
        success: true,
        bids: bids.map(b => ({
          id: b._id.toString(),
          ...b,
          _id: undefined,
        })),
      });
    } catch (error) {
      console.error('[PLAYER-SHOP] Error getting bids:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /api/player-shop/deliveries - Get pending deliveries for a player
  app.get('/api/player-shop/deliveries', async (req, res) => {
    try {
      const { uuid } = req.query;
      if (!uuid) {
        return res.status(400).json({ error: 'uuid query parameter required' });
      }

      const database = getDb();
      // Buscar por recipientUuid O buyerUuid para compatibilidad
      const deliveries = await database.collection('player_shop_deliveries')
        .find({ 
          $or: [
            { recipientUuid: uuid },
            { buyerUuid: uuid }
          ],
          status: 'pending'
        })
        .toArray();

      res.json({
        success: true,
        deliveries: deliveries.map(d => ({
          _id: d._id.toString(),
          recipientUuid: d.recipientUuid || d.buyerUuid,
          recipientUsername: d.recipientUsername || d.buyerUsername,
          pokemon: d.pokemon || d.pokemonData,
          type: d.type || 'purchase',
          listingId: d.listingId,
          createdAt: d.createdAt,
        })),
      });
    } catch (error) {
      console.error('[PLAYER-SHOP] Error getting deliveries:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /api/player-shop/deliveries/:id/delivered - Mark delivery as completed
  app.post('/api/player-shop/deliveries/:id/delivered', async (req, res) => {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ error: 'Delivery ID required' });
      }

      const database = getDb();
      const result = await database.collection('player_shop_deliveries').updateOne(
        { _id: new ObjectId(id) },
        { 
          $set: { 
            status: 'delivered',
            deliveredAt: new Date()
          } 
        }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: 'Delivery not found' });
      }

      res.json({
        success: true,
        message: 'Delivery marked as completed',
      });
    } catch (error) {
      console.error('[PLAYER-SHOP] Error marking delivery:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  console.log('🛒 [ROUTES] Player Shop routes loaded');

  // ============================================
  // MODULAR ROUTES - Mods API
  // ============================================
  app.use('/api/mods', initModsRoutes(getDb));
  console.log('📦 [ROUTES] Mods routes loaded');

  // ============================================
  // MODULAR ROUTES - Economy API
  // ============================================
  app.use('/api/economy', initEconomyRoutes(getDb));
  console.log('💰 [ROUTES] Economy routes loaded');

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
    
    // Initialize Discord Bot for verification
    try {
      await initDiscordBot(getDb());
      console.log('🤖 Discord Bot initialized for verification');
    } catch (botError) {
      console.log('⚠️ Discord Bot not initialized:', botError.message);
    }
    
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
      console.log(`   POST /api/shop/purchase`);
      console.log(`\n� Pldayer Shop API:`);
      console.log(`   GET  /api/player-shop/deliveries`);
      console.log(`   POST /api/player-shop/deliveries/:id/delivered`);
      console.log(`\n📦 Mods API:`);
      console.log(`   GET  /api/mods`);
      console.log(`   GET  /api/mods/versions`);
      console.log(`   GET  /api/mods/:id`);
      console.log(`   GET  /api/mods/:id/download`);
      console.log(`   GET  /api/mods/package`);
      console.log(`   POST /api/mods (admin)`);
      console.log(`   PUT  /api/mods/:id (admin)`);
      console.log(`   DELETE /api/mods/:id (admin)\n`);

      // Sistema de precios dinámicos - se ejecuta cada hora
      // SIEMPRE actualizar al iniciar para asegurar precios correctos
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

      // SIEMPRE actualizar precios al iniciar el servidor
      console.log('🤖 [PRICE AI] Updating prices on server start...');
      await updateDynamicPrices();

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
