/**
 * Script para actualizar los precios de las Pokébolas
 * Los precios anteriores eran muy bajos para la economía actual
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;

// Nuevos precios - MUCHO más altos para balancear con 300k+ de balance
const NEW_PRICES = {
  // Standard Balls
  'poke_ball': { basePrice: 500, currentPrice: 500 },
  'great_ball': { basePrice: 1500, currentPrice: 1500 },
  'ultra_ball': { basePrice: 3500, currentPrice: 3500 },
  'master_ball': { basePrice: 500000, currentPrice: 500000 }, // 500k - extremadamente rara
  
  // Special Balls
  'premier_ball': { basePrice: 500, currentPrice: 500 },
  'luxury_ball': { basePrice: 8000, currentPrice: 8000 },
  'heal_ball': { basePrice: 1500, currentPrice: 1500 },
  'safari_ball': { basePrice: 15000, currentPrice: 15000 },
  'sport_ball': { basePrice: 15000, currentPrice: 15000 },
  'dream_ball': { basePrice: 25000, currentPrice: 25000 },
  'beast_ball': { basePrice: 120000, currentPrice: 120000 }, // 120k como pediste
  
  // Situational Balls
  'net_ball': { basePrice: 6000, currentPrice: 6000 },
  'dive_ball': { basePrice: 6000, currentPrice: 6000 },
  'nest_ball': { basePrice: 6000, currentPrice: 6000 },
  'repeat_ball': { basePrice: 6000, currentPrice: 6000 },
  'timer_ball': { basePrice: 6000, currentPrice: 6000 },
  'quick_ball': { basePrice: 8000, currentPrice: 8000 },
  'dusk_ball': { basePrice: 6000, currentPrice: 6000 },
  
  // Apricorn Balls (muy raras)
  'level_ball': { basePrice: 35000, currentPrice: 35000 },
  'lure_ball': { basePrice: 30000, currentPrice: 30000 },
  'moon_ball': { basePrice: 40000, currentPrice: 40000 },
  'friend_ball': { basePrice: 30000, currentPrice: 30000 },
  'love_ball': { basePrice: 45000, currentPrice: 45000 },
  'heavy_ball': { basePrice: 30000, currentPrice: 30000 },
  'fast_ball': { basePrice: 30000, currentPrice: 30000 },
};

async function updatePrices() {
  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI not set');
    process.exit(1);
  }

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db();
    const collection = db.collection('shop_items');

    console.log('\n📊 Updating Pokéball prices...\n');

    for (const [id, prices] of Object.entries(NEW_PRICES)) {
      const result = await collection.updateOne(
        { id },
        { 
          $set: { 
            basePrice: prices.basePrice,
            currentPrice: prices.currentPrice,
            updatedAt: new Date()
          }
        }
      );
      
      if (result.matchedCount > 0) {
        console.log(`✅ ${id}: ${prices.currentPrice} CD`);
      } else {
        console.log(`⚠️  ${id}: Not found in database`);
      }
    }

    console.log('\n✅ Prices updated successfully!');
    console.log('\n📋 New price summary:');
    console.log('   Standard: Poké 500, Great 1.5k, Ultra 3.5k, Master 500k');
    console.log('   Situational: 6-8k each');
    console.log('   Apricorn: 30-45k each');
    console.log('   Special: Dream 25k, Beast 120k');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

updatePrices();
