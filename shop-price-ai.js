/**
 * Sistema de Precios Dinámicos con IA
 * Analiza el balance de todos los jugadores y ajusta precios cada hora
 * 
 * Ejecutar manualmente: node shop-price-ai.js
 * O configurar como cron job cada hora
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;

// Multiplicadores de rareza - basados en el percentil 75 de la economía
const RARITY_MULTIPLIERS = {
  // Standard balls - accesibles pero no regaladas
  'poke_ball': { rarity: 'common', multiplier: 0.01 },      // 1% del p75
  'great_ball': { rarity: 'common', multiplier: 0.02 },     // 2% del p75
  'ultra_ball': { rarity: 'uncommon', multiplier: 0.05 },   // 5% del p75
  
  // Special balls
  'premier_ball': { rarity: 'common', multiplier: 0.01 },
  'luxury_ball': { rarity: 'uncommon', multiplier: 0.04 },
  'heal_ball': { rarity: 'common', multiplier: 0.015 },
  
  // Situational balls - precio moderado
  'net_ball': { rarity: 'uncommon', multiplier: 0.04 },
  'dive_ball': { rarity: 'uncommon', multiplier: 0.04 },
  'nest_ball': { rarity: 'uncommon', multiplier: 0.04 },
  'repeat_ball': { rarity: 'uncommon', multiplier: 0.04 },
  'timer_ball': { rarity: 'uncommon', multiplier: 0.04 },
  'quick_ball': { rarity: 'rare', multiplier: 0.06 },
  'dusk_ball': { rarity: 'uncommon', multiplier: 0.05 },
  
  // Apricorn balls - precio alto (raras)
  'level_ball': { rarity: 'rare', multiplier: 0.08 },
  'lure_ball': { rarity: 'rare', multiplier: 0.08 },
  'moon_ball': { rarity: 'rare', multiplier: 0.08 },
  'friend_ball': { rarity: 'rare', multiplier: 0.08 },
  'love_ball': { rarity: 'rare', multiplier: 0.10 },
  'heavy_ball': { rarity: 'rare', multiplier: 0.08 },
  'fast_ball': { rarity: 'rare', multiplier: 0.08 },
  
  // Special rare balls
  'safari_ball': { rarity: 'rare', multiplier: 0.07 },
  'sport_ball': { rarity: 'rare', multiplier: 0.07 },
  'dream_ball': { rarity: 'epic', multiplier: 0.15 },
  'beast_ball': { rarity: 'epic', multiplier: 0.25 },
  
  // Master Ball - extremadamente cara (50% del balance de un jugador rico)
  'master_ball': { rarity: 'legendary', multiplier: 0.50 },
  
  // ============================================
  // COMIDA DE MINECRAFT
  // ============================================
  'golden_apple': { rarity: 'rare', multiplier: 0.05 },
  'enchanted_golden_apple': { rarity: 'legendary', multiplier: 0.35 },
  'golden_carrot': { rarity: 'uncommon', multiplier: 0.02 },
  'cooked_beef': { rarity: 'common', multiplier: 0.005 },
  'cooked_porkchop': { rarity: 'common', multiplier: 0.005 },
  
  // ============================================
  // POKÉMON CANDIES
  // ============================================
  'rare_candy': { rarity: 'epic', multiplier: 0.12 },
  'exp_candy_xs': { rarity: 'common', multiplier: 0.005 },
  'exp_candy_s': { rarity: 'uncommon', multiplier: 0.015 },
  'exp_candy_m': { rarity: 'rare', multiplier: 0.04 },
  'exp_candy_l': { rarity: 'epic', multiplier: 0.10 },
  'exp_candy_xl': { rarity: 'legendary', multiplier: 0.20 },
};

// Precios mínimos AGRESIVOS para evitar que sean demasiado baratos
const MIN_PRICES = {
  'common': 500,
  'uncommon': 2000,
  'rare': 8000,
  'epic': 25000,
  'legendary': 150000,  // Master Ball MÍNIMO 150k
};

// Precios máximos para evitar que sean imposibles
const MAX_PRICES = {
  'common': 5000,
  'uncommon': 15000,
  'rare': 40000,
  'epic': 150000,
  'legendary': 500000,
};

async function analyzeAndUpdatePrices() {
  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI not set');
    process.exit(1);
  }

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    console.log('🤖 Analyzing player economy...\n');

    const db = client.db(process.env.MONGODB_DATABASE || 'admin');
    
    // 1. Obtener todos los balances de jugadores
    const users = await db.collection('users').find({
      cobbleDollars: { $exists: true, $gt: 0 }
    }).toArray();

    if (users.length === 0) {
      console.log('⚠️  No players with balance found. Using default prices.');
      return;
    }

    // 2. Calcular estadísticas de la economía
    const balances = users.map(u => u.cobbleDollars || 0).filter(b => b > 0);
    const totalBalance = balances.reduce((a, b) => a + b, 0);
    const averageBalance = Math.round(totalBalance / balances.length);
    const medianBalance = getMedian(balances);
    const maxBalance = Math.max(...balances);
    const minBalance = Math.min(...balances);
    
    // Calcular percentil 75 (jugadores ricos) - ESTO ES LO IMPORTANTE
    const p75Balance = getPercentile(balances, 75);
    
    // Calcular promedio de los top 10 jugadores
    const sortedBalances = [...balances].sort((a, b) => b - a);
    const top10 = sortedBalances.slice(0, Math.min(10, sortedBalances.length));
    const top10Average = Math.round(top10.reduce((a, b) => a + b, 0) / top10.length);
    
    // USAR EL MAYOR entre p75 y top10Average como base
    // Esto asegura que los precios reflejen la economía de los jugadores activos
    const basePrice = Math.max(p75Balance, top10Average);

    console.log('📊 Economy Analysis:');
    console.log(`   Players with balance: ${balances.length}`);
    console.log(`   Total economy: ${totalBalance.toLocaleString()} CobbleDollars`);
    console.log(`   Average balance: ${averageBalance.toLocaleString()}`);
    console.log(`   Median balance: ${medianBalance.toLocaleString()}`);
    console.log(`   75th Percentile: ${p75Balance.toLocaleString()}`);
    console.log(`   Top 10 Average: ${top10Average.toLocaleString()}`);
    console.log(`   Min balance: ${minBalance.toLocaleString()}`);
    console.log(`   Max balance: ${maxBalance.toLocaleString()}`);
    console.log(`\n🎯 Base price (max of p75/top10): ${basePrice.toLocaleString()}\n`);

    // 3. Calcular nuevos precios para cada pokébola
    const shopItems = await db.collection('shop_items').find({}).toArray();
    
    console.log('💰 New Prices:');
    console.log('─'.repeat(60));

    for (const item of shopItems) {
      const config = RARITY_MULTIPLIERS[item.id] || { rarity: 'uncommon', multiplier: 1.0 };
      
      // Calcular precio base según rareza
      let newPrice = Math.round(basePrice * config.multiplier);
      
      // Aplicar límites mínimos y máximos
      const minPrice = MIN_PRICES[config.rarity] || 100;
      const maxPrice = MAX_PRICES[config.rarity] || 100000;
      
      newPrice = Math.max(minPrice, Math.min(maxPrice, newPrice));
      
      // Redondear a números bonitos (múltiplos de 50 o 100)
      if (newPrice < 1000) {
        newPrice = Math.round(newPrice / 50) * 50;
      } else if (newPrice < 10000) {
        newPrice = Math.round(newPrice / 100) * 100;
      } else {
        newPrice = Math.round(newPrice / 500) * 500;
      }

      // Actualizar en la base de datos
      await db.collection('shop_items').updateOne(
        { id: item.id },
        { 
          $set: { 
            currentPrice: newPrice,
            lastPriceUpdate: new Date(),
            priceAnalysis: {
              basePrice: basePrice,
              multiplier: config.multiplier,
              rarity: config.rarity,
              playersAnalyzed: balances.length,
            }
          } 
        }
      );

      const priceChange = item.currentPrice ? 
        ((newPrice - item.currentPrice) / item.currentPrice * 100).toFixed(1) : 'NEW';
      const changeIcon = priceChange === 'NEW' ? '🆕' : 
        parseFloat(priceChange) > 0 ? '📈' : 
        parseFloat(priceChange) < 0 ? '📉' : '➡️';

      console.log(`   ${changeIcon} ${item.name.padEnd(15)} ${config.rarity.padEnd(10)} $${newPrice.toLocaleString().padStart(8)} (${priceChange}%)`);
    }

    // 4. Randomizar stock también
    console.log('\n📦 Randomizing Stock:');
    console.log('─'.repeat(60));

    for (const item of shopItems) {
      const config = RARITY_MULTIPLIERS[item.id] || { rarity: 'uncommon', multiplier: 1.0 };
      
      // Stock basado en rareza
      let maxStock, minStock;
      switch (config.rarity) {
        case 'common':
          minStock = 50; maxStock = 150;
          break;
        case 'uncommon':
          minStock = 20; maxStock = 60;
          break;
        case 'rare':
          minStock = 5; maxStock = 20;
          break;
        case 'epic':
          minStock = 2; maxStock = 8;
          break;
        case 'legendary':
          minStock = 0; maxStock = 2;
          break;
        default:
          minStock = 10; maxStock = 50;
      }

      const newStock = Math.floor(Math.random() * (maxStock - minStock + 1)) + minStock;

      await db.collection('shop_items').updateOne(
        { id: item.id },
        { 
          $set: { 
            currentStock: newStock,
            maxStock: maxStock,
            lastStockUpdate: new Date(),
          } 
        }
      );

      console.log(`   ${item.name.padEnd(15)} ${config.rarity.padEnd(10)} ${newStock}/${maxStock} units`);
    }

    // 5. Guardar registro del análisis
    await db.collection('price_history').insertOne({
      timestamp: new Date(),
      playersAnalyzed: balances.length,
      averageBalance,
      medianBalance,
      totalEconomy: totalBalance,
      basePrice,
    });

    console.log('\n✅ Prices and stock updated successfully!');
    console.log(`📅 Next update should run in 1 hour.`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

function getMedian(arr) {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function getPercentile(arr, percentile) {
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

// Ejecutar
analyzeAndUpdatePrices();
