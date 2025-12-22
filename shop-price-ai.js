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

// Multiplicadores de rareza - cuanto más raro, más caro respecto al promedio
const RARITY_MULTIPLIERS = {
  // Standard balls - precio cercano al promedio
  'poke_ball': { rarity: 'common', multiplier: 0.3 },      // 30% del promedio
  'great_ball': { rarity: 'common', multiplier: 0.5 },     // 50% del promedio
  'ultra_ball': { rarity: 'uncommon', multiplier: 0.8 },   // 80% del promedio
  
  // Special balls - precio igual o mayor al promedio
  'premier_ball': { rarity: 'common', multiplier: 0.3 },
  'luxury_ball': { rarity: 'uncommon', multiplier: 0.7 },
  'heal_ball': { rarity: 'common', multiplier: 0.4 },
  
  // Situational balls - precio moderado-alto
  'net_ball': { rarity: 'uncommon', multiplier: 0.7 },
  'dive_ball': { rarity: 'uncommon', multiplier: 0.7 },
  'nest_ball': { rarity: 'uncommon', multiplier: 0.7 },
  'repeat_ball': { rarity: 'uncommon', multiplier: 0.7 },
  'timer_ball': { rarity: 'uncommon', multiplier: 0.7 },
  'quick_ball': { rarity: 'rare', multiplier: 1.0 },       // 100% del promedio
  'dusk_ball': { rarity: 'uncommon', multiplier: 0.8 },
  
  // Apricorn balls - precio alto (raras)
  'level_ball': { rarity: 'rare', multiplier: 1.5 },       // 150% del promedio
  'lure_ball': { rarity: 'rare', multiplier: 1.5 },
  'moon_ball': { rarity: 'rare', multiplier: 1.5 },
  'friend_ball': { rarity: 'rare', multiplier: 1.5 },
  'love_ball': { rarity: 'rare', multiplier: 1.8 },        // 180% del promedio
  'heavy_ball': { rarity: 'rare', multiplier: 1.5 },
  'fast_ball': { rarity: 'rare', multiplier: 1.5 },
  
  // Special rare balls
  'safari_ball': { rarity: 'rare', multiplier: 1.2 },
  'sport_ball': { rarity: 'rare', multiplier: 1.2 },
  'dream_ball': { rarity: 'epic', multiplier: 2.0 },       // 200% del promedio
  'beast_ball': { rarity: 'epic', multiplier: 3.0 },       // 300% del promedio
  
  // Master Ball - extremadamente cara
  'master_ball': { rarity: 'legendary', multiplier: 10.0 }, // 1000% del promedio
};

// Precios mínimos para evitar que sean demasiado baratos
const MIN_PRICES = {
  'common': 100,
  'uncommon': 500,
  'rare': 1500,
  'epic': 5000,
  'legendary': 50000,
};

// Precios máximos para evitar que sean imposibles
const MAX_PRICES = {
  'common': 2000,
  'uncommon': 8000,
  'rare': 25000,
  'epic': 100000,
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
    
    // Usar la mediana como base (más resistente a outliers)
    const basePrice = medianBalance;

    console.log('📊 Economy Analysis:');
    console.log(`   Players with balance: ${balances.length}`);
    console.log(`   Total economy: ${totalBalance.toLocaleString()} CobbleDollars`);
    console.log(`   Average balance: ${averageBalance.toLocaleString()}`);
    console.log(`   Median balance: ${medianBalance.toLocaleString()}`);
    console.log(`   Min balance: ${minBalance.toLocaleString()}`);
    console.log(`   Max balance: ${maxBalance.toLocaleString()}`);
    console.log(`\n🎯 Base price (median): ${basePrice.toLocaleString()}\n`);

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

// Ejecutar
analyzeAndUpdatePrices();
