/**
 * Script para seedear items adicionales en la tienda
 * Incluye: Comida de Minecraft, Rare Candies, XP Candies
 * Ejecutar con: node seed-shop-items.js
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;

// Items adicionales para la tienda
// Usando sprites de fuentes confiables que no bloquean hotlinking
const SHOP_ITEMS = [
  // ============================================
  // COMIDA DE MINECRAFT (sprites de mc-heads.net - funciona sin hotlink protection)
  // ============================================
  {
    id: 'golden_apple',
    minecraftId: 'minecraft:golden_apple',
    name: 'Golden Apple',
    description: 'Manzana dorada. Regeneración II y Absorción por 2 minutos.',
    sprite: 'https://mc-heads.net/item/golden_apple/64',
    type: 'food',
    category: 'minecraft',
    basePrice: 5000,
    currentPrice: 5000,
    currentStock: 20,
    maxStock: 20,
    rarity: 'rare',
  },
  {
    id: 'enchanted_golden_apple',
    minecraftId: 'minecraft:enchanted_golden_apple',
    name: 'Enchanted Golden Apple',
    description: 'La legendaria Notch Apple. Regeneración V, Absorción IV, Resistencia.',
    sprite: 'https://mc-heads.net/item/enchanted_golden_apple/64',
    type: 'food',
    category: 'minecraft',
    basePrice: 50000,
    currentPrice: 50000,
    currentStock: 3,
    maxStock: 3,
    rarity: 'legendary',
  },
  {
    id: 'golden_carrot',
    minecraftId: 'minecraft:golden_carrot',
    name: 'Golden Carrot',
    description: 'Zanahoria dorada. La mejor comida del juego en saturación.',
    sprite: 'https://mc-heads.net/item/golden_carrot/64',
    type: 'food',
    category: 'minecraft',
    basePrice: 2000,
    currentPrice: 2000,
    currentStock: 50,
    maxStock: 50,
    rarity: 'uncommon',
  },
  {
    id: 'cooked_beef',
    minecraftId: 'minecraft:cooked_beef',
    name: 'Steak',
    description: 'Filete de res cocido. Restaura 8 de hambre y 12.8 de saturación.',
    sprite: 'https://mc-heads.net/item/cooked_beef/64',
    type: 'food',
    category: 'minecraft',
    basePrice: 500,
    currentPrice: 500,
    currentStock: 100,
    maxStock: 100,
    rarity: 'common',
  },
  {
    id: 'cooked_porkchop',
    minecraftId: 'minecraft:cooked_porkchop',
    name: 'Cooked Porkchop',
    description: 'Chuleta de cerdo cocida. Restaura 8 de hambre y 12.8 de saturación.',
    sprite: 'https://mc-heads.net/item/cooked_porkchop/64',
    type: 'food',
    category: 'minecraft',
    basePrice: 500,
    currentPrice: 500,
    currentStock: 100,
    maxStock: 100,
    rarity: 'common',
  },

  // ============================================
  // POKÉMON CANDIES (sprites de PokeAPI - siempre funcionan)
  // ============================================
  {
    id: 'rare_candy',
    cobblemonId: 'cobblemon:rare_candy',
    name: 'Rare Candy',
    description: 'Sube 1 nivel a tu Pokémon instantáneamente.',
    sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/rare-candy.png',
    type: 'candy',
    category: 'pokemon',
    basePrice: 10000,
    currentPrice: 10000,
    currentStock: 10,
    maxStock: 10,
    rarity: 'epic',
  },
  {
    id: 'exp_candy_xs',
    cobblemonId: 'cobblemon:exp_candy_xs',
    name: 'Exp. Candy XS',
    description: 'Da 100 puntos de experiencia a un Pokémon.',
    sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/exp-candy-xs.png',
    type: 'candy',
    category: 'pokemon',
    basePrice: 500,
    currentPrice: 500,
    currentStock: 50,
    maxStock: 50,
    rarity: 'common',
  },
  {
    id: 'exp_candy_s',
    cobblemonId: 'cobblemon:exp_candy_s',
    name: 'Exp. Candy S',
    description: 'Da 800 puntos de experiencia a un Pokémon.',
    sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/exp-candy-s.png',
    type: 'candy',
    category: 'pokemon',
    basePrice: 1500,
    currentPrice: 1500,
    currentStock: 30,
    maxStock: 30,
    rarity: 'uncommon',
  },
  {
    id: 'exp_candy_m',
    cobblemonId: 'cobblemon:exp_candy_m',
    name: 'Exp. Candy M',
    description: 'Da 3,000 puntos de experiencia a un Pokémon.',
    sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/exp-candy-m.png',
    type: 'candy',
    category: 'pokemon',
    basePrice: 4000,
    currentPrice: 4000,
    currentStock: 20,
    maxStock: 20,
    rarity: 'rare',
  },
  {
    id: 'exp_candy_l',
    cobblemonId: 'cobblemon:exp_candy_l',
    name: 'Exp. Candy L',
    description: 'Da 10,000 puntos de experiencia a un Pokémon.',
    sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/exp-candy-l.png',
    type: 'candy',
    category: 'pokemon',
    basePrice: 12000,
    currentPrice: 12000,
    currentStock: 10,
    maxStock: 10,
    rarity: 'epic',
  },
  {
    id: 'exp_candy_xl',
    cobblemonId: 'cobblemon:exp_candy_xl',
    name: 'Exp. Candy XL',
    description: 'Da 30,000 puntos de experiencia a un Pokémon.',
    sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/exp-candy-xl.png',
    type: 'candy',
    category: 'pokemon',
    basePrice: 30000,
    currentPrice: 30000,
    currentStock: 5,
    maxStock: 5,
    rarity: 'legendary',
  },
];

async function seedShopItems() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Conectado a MongoDB');
    
    const db = client.db(process.env.MONGODB_DATABASE || 'admin');
    const collection = db.collection('shop_items');
    
    // Insertar o actualizar cada item
    for (const item of SHOP_ITEMS) {
      await collection.updateOne(
        { id: item.id },
        { 
          $set: {
            ...item,
            updatedAt: new Date(),
          },
          $setOnInsert: {
            createdAt: new Date(),
          }
        },
        { upsert: true }
      );
      console.log(`✅ ${item.name} (${item.type}) - ${item.rarity}`);
    }
    
    console.log(`\n🎉 ${SHOP_ITEMS.length} items actualizados con sprites funcionales!`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

seedShopItems();
