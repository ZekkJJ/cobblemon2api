/**
 * Script para actualizar los sprites de comida a los oficiales de Minecraft
 * Ejecutar con: node fix-food-sprites.js
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;

// Sprites de Minecraft - usando mc-heads.net que permite hotlinking
const FOOD_SPRITES = {
  'golden_apple': 'https://mc.nerothe.com/img/1.20.1/golden_apple.png',
  'enchanted_golden_apple': 'https://mc.nerothe.com/img/1.20.1/enchanted_golden_apple.png',
  'golden_carrot': 'https://mc.nerothe.com/img/1.20.1/golden_carrot.png',
  'cooked_beef': 'https://mc.nerothe.com/img/1.20.1/cooked_beef.png',
  'cooked_porkchop': 'https://mc.nerothe.com/img/1.20.1/cooked_porkchop.png',
};

async function fixFoodSprites() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Conectado a MongoDB');
    
    const db = client.db(process.env.MONGODB_DATABASE || 'admin');
    const collection = db.collection('shop_items');
    
    for (const [itemId, sprite] of Object.entries(FOOD_SPRITES)) {
      const result = await collection.updateOne(
        { id: itemId },
        { $set: { sprite: sprite } }
      );
      
      if (result.matchedCount > 0) {
        console.log(`✅ ${itemId}: sprite actualizado`);
      } else {
        console.log(`⚠️  ${itemId}: no encontrado en la tienda`);
      }
    }
    
    console.log('\n🎉 Sprites de comida actualizados!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

fixFoodSprites();
